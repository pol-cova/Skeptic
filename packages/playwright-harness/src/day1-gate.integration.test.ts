import { startOrReuseApp, stopApp, type StartAppResult } from "@skeptic/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CRITERION_2_TEXT,
  expectedVerdictForPersistenceMode,
  runDay1GateWithHarness,
} from "./day1-gate.ts";

const BASE_URL = "http://127.0.0.1:3100";
const ALLOWED_ORIGINS = [BASE_URL];
const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

let appStartup: StartAppResult | null = null;

async function readPersistenceMode(): Promise<boolean | null> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      persistenceEnabled?: boolean;
    };
    return payload.persistenceEnabled ?? null;
  } catch {
    return null;
  }
}

async function startDemoApp(persistenceFixed: boolean): Promise<void> {
  await stopApp(appStartup?.process ?? null);
  appStartup = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if ((await readPersistenceMode()) === null) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const env = {
    ...process.env,
    DEMO_PERSIST_INVITATIONS: persistenceFixed ? "true" : "false",
  };

  appStartup = await startOrReuseApp({
    baseUrl: BASE_URL,
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
    env,
  });

  const persistenceEnabled = await readPersistenceMode();
  expect(persistenceEnabled).toBe(persistenceFixed);
}

describe("Day 1 gate: criterion 2 persistence proof", () => {
  beforeAll(async () => {
    await startDemoApp(false);
  }, 120_000);

  afterAll(async () => {
    await stopApp(appStartup?.process ?? null);
  });

  it("returns FAIL for the seeded persistence defect without an LLM", async () => {
    const result = await runDay1GateWithHarness({
      baseUrl: BASE_URL,
      allowedOrigins: ALLOWED_ORIGINS,
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
      inviteEmail: `seeded-bug-${Date.now()}@example.com`,
    });

    expect(result.verdict.sourceText).toBe(CRITERION_2_TEXT);
    expect(result.verdict.verdict).toBe("FAIL");
    expect(result.verdict.explanation).toContain("contradicts");
    expect(result.assertionResults.some((entry) => !entry.passed)).toBe(true);
    expect(result.artifactRefs.length).toBeGreaterThan(0);
    expect(result.screenshots.afterSubmit.byteLength).toBeGreaterThan(0);
    expect(result.screenshots.afterReload.byteLength).toBeGreaterThan(0);
  }, 120_000);

  it("returns PASS after the prepared persistence fix", async () => {
    await startDemoApp(true);

    const result = await runDay1GateWithHarness({
      baseUrl: BASE_URL,
      allowedOrigins: ALLOWED_ORIGINS,
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
      inviteEmail: `fixed-${Date.now()}@example.com`,
    });

    expect(result.verdict.verdict).toBe(
      expectedVerdictForPersistenceMode(true),
    );
    expect(result.verdict.explanation).toContain("Deterministic assertions");
    expect(result.assertionResults.every((entry) => entry.passed)).toBe(true);
  }, 120_000);
});

import { startOrReuseApp, stopApp, type StartAppResult } from "@skeptic/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CRITERION_2_TEXT,
  expectedVerdictForPersistenceMode,
  runDay1GateWithHarness,
} from "./day1-gate.ts";

const SEEDED_BASE_URL = "http://127.0.0.1:3100";
const FIXED_BASE_URL = "http://127.0.0.1:3101";
const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

async function readPersistenceMode(baseUrl: string): Promise<boolean | null> {
  try {
    const response = await fetch(`${baseUrl}/health`);
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

async function startDemoApp(
  baseUrl: string,
  persistenceFixed: boolean,
): Promise<StartAppResult> {
  const port = new URL(baseUrl).port;
  const env = {
    ...process.env,
    DEMO_PERSIST_INVITATIONS: persistenceFixed ? "true" : "false",
  };

  const result = await startOrReuseApp({
    baseUrl,
    startCommand: `pnpm --filter demo-app exec next dev --port ${port}`,
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
    env,
    reuseExisting: false,
  });

  const persistenceEnabled = await readPersistenceMode(baseUrl);
  expect(persistenceEnabled).toBe(persistenceFixed);

  return result;
}

describe("Day 1 gate: criterion 2 persistence proof", () => {
  describe("seeded persistence defect", () => {
    let appStartup: StartAppResult | null = null;

    beforeAll(async () => {
      appStartup = await startDemoApp(SEEDED_BASE_URL, false);
    }, 120_000);

    afterAll(async () => {
      await stopApp(appStartup?.process ?? null);
    });

    it("returns FAIL for the seeded persistence defect without an LLM", async () => {
      const result = await runDay1GateWithHarness({
        baseUrl: SEEDED_BASE_URL,
        allowedOrigins: [SEEDED_BASE_URL],
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
  });

  describe("prepared persistence fix", () => {
    let appStartup: StartAppResult | null = null;

    beforeAll(async () => {
      appStartup = await startDemoApp(FIXED_BASE_URL, true);
    }, 120_000);

    afterAll(async () => {
      await stopApp(appStartup?.process ?? null);
    });

    it("returns PASS after the prepared persistence fix", async () => {
      const result = await runDay1GateWithHarness({
        baseUrl: FIXED_BASE_URL,
        allowedOrigins: [FIXED_BASE_URL],
        username: DEMO_USERNAME,
        password: DEMO_PASSWORD,
        inviteEmail: `fixed-${Date.now()}@example.com`,
        requirePersistedRow: true,
      });

      expect(result.verdict.verdict).toBe(
        expectedVerdictForPersistenceMode(true),
      );
      expect(result.verdict.explanation).toContain("Deterministic assertions");
      expect(result.assertionResults.every((entry) => entry.passed)).toBe(true);
    }, 120_000);
  });
});

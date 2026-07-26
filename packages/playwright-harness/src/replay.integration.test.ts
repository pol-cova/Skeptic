import { startOrReuseApp, stopApp, type StartAppResult } from "@skeptic/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildDemoReplayFixture } from "./replay-fixtures.ts";
import { replayFixture } from "./replay-runner.ts";

const FIXED_BASE_URL = "http://127.0.0.1:3101";
const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

async function startDemoApp(): Promise<StartAppResult> {
  const port = new URL(FIXED_BASE_URL).port;
  return startOrReuseApp({
    baseUrl: FIXED_BASE_URL,
    startCommand: `pnpm --filter demo-app exec next dev --port ${port}`,
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
    env: {
      ...process.env,
      DEMO_PERSIST_INVITATIONS: "true",
    },
    reuseExisting: false,
  });
}

describe("replay integration", () => {
  let appStartup: StartAppResult | null = null;

  beforeAll(async () => {
    appStartup = await startDemoApp();
  }, 120_000);

  afterAll(async () => {
    await stopApp(appStartup?.process ?? null);
  });

  it("produces three PASS verdicts with zero model calls", async () => {
    const inviteEmail = `replay-int-${Date.now()}@example.com`;
    const fixture = buildDemoReplayFixture({
      baseUrl: FIXED_BASE_URL,
      allowedOrigins: [FIXED_BASE_URL],
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
      inviteEmail,
    });

    const result = await replayFixture({ fixture });

    expect(result.modelCalls).toBe(0);
    expect(result.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "PASS",
      "PASS",
    ]);
    expect(result.readiness).toBe("READY");
  }, 300_000);
});

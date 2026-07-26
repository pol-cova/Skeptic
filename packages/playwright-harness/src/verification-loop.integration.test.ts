import {
  executeRunPlan,
  startOrReuseApp,
  stopApp,
  withPrerequisites,
  type StartAppResult,
} from "@skeptic/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CRITERION_2_TEXT, runDay1GateWithHarness } from "./day1-gate.ts";
import {
  CRITERION_1_TEXT,
  CRITERION_3_TEXT,
  runCriterion1WithHarness,
  runCriterion3WithHarness,
} from "./verification-loop.ts";

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

const demoCriteria = withPrerequisites(
  [
    {
      index: 1,
      sourceText: CRITERION_1_TEXT,
      prerequisites: [],
    },
    {
      index: 2,
      sourceText: CRITERION_2_TEXT,
      prerequisites: [],
    },
    {
      index: 3,
      sourceText: CRITERION_3_TEXT,
      prerequisites: [2],
    },
  ],
  { 3: [2] },
);

describe("verification loop integration", () => {
  describe("seeded persistence defect", () => {
    let appStartup: StartAppResult | null = null;

    beforeAll(async () => {
      appStartup = await startDemoApp(SEEDED_BASE_URL, false);
    }, 120_000);

    afterAll(async () => {
      await stopApp(appStartup?.process ?? null);
    });

    it("returns PASS for criterion 1 and FAIL for criterion 2", async () => {
      const criterion1 = await runCriterion1WithHarness({
        baseUrl: SEEDED_BASE_URL,
        username: DEMO_USERNAME,
        password: DEMO_PASSWORD,
      });

      expect(criterion1.verdict.verdict).toBe("PASS");
      expect(criterion1.verdict.explanation).toContain(
        "Deterministic assertions",
      );
      expect(criterion1.loopState.hypothesis.length).toBeGreaterThan(0);
      expect(criterion1.artifactRefs.length).toBeGreaterThan(0);

      const criterion2 = await runDay1GateWithHarness({
        baseUrl: SEEDED_BASE_URL,
        allowedOrigins: [SEEDED_BASE_URL],
        username: DEMO_USERNAME,
        password: DEMO_PASSWORD,
        inviteEmail: `loop-seeded-${Date.now()}@example.com`,
      });

      expect(criterion2.verdict.verdict).toBe("FAIL");
    }, 180_000);

    it("marks criterion 3 UNVERIFIABLE when criterion 2 fails", async () => {
      const result = await executeRunPlan({
        criteria: demoCriteria,
        context: {
          credentialAvailability: {
            username: DEMO_USERNAME,
            password: DEMO_PASSWORD,
          },
        },
        async executeCriterion(criterion) {
          if (criterion.index === 1) {
            const loopResult = await runCriterion1WithHarness({
              baseUrl: SEEDED_BASE_URL,
              username: DEMO_USERNAME,
              password: DEMO_PASSWORD,
            });
            return { verdict: loopResult.verdict };
          }

          if (criterion.index === 2) {
            const gateResult = await runDay1GateWithHarness({
              baseUrl: SEEDED_BASE_URL,
              allowedOrigins: [SEEDED_BASE_URL],
              username: DEMO_USERNAME,
              password: DEMO_PASSWORD,
              inviteEmail: `plan-seeded-${Date.now()}@example.com`,
            });
            return { verdict: gateResult.verdict };
          }

          throw new Error("Criterion 3 should have been skipped.");
        },
      });

      expect(result.verdicts[0]?.verdict).toBe("PASS");
      expect(result.verdicts[1]?.verdict).toBe("FAIL");
      expect(result.verdicts[2]?.verdict).toBe("UNVERIFIABLE");
      expect(result.verdicts[2]?.prerequisiteFailure?.index).toBe(2);
      expect(result.readiness).toBe("NOT_READY");
    }, 240_000);
  });

  describe("prepared persistence fix", () => {
    let appStartup: StartAppResult | null = null;

    beforeAll(async () => {
      appStartup = await startDemoApp(FIXED_BASE_URL, true);
    }, 120_000);

    afterAll(async () => {
      await stopApp(appStartup?.process ?? null);
    });

    it("executes criterion 3 after criterion 2 passes", async () => {
      const inviteEmail = `loop-fixed-${Date.now()}@example.com`;
      const result = await executeRunPlan({
        criteria: demoCriteria,
        context: {
          credentialAvailability: {
            username: DEMO_USERNAME,
            password: DEMO_PASSWORD,
          },
        },
        async executeCriterion(criterion) {
          if (criterion.index === 1) {
            const loopResult = await runCriterion1WithHarness({
              baseUrl: FIXED_BASE_URL,
              username: DEMO_USERNAME,
              password: DEMO_PASSWORD,
            });
            return { verdict: loopResult.verdict };
          }

          if (criterion.index === 2) {
            const gateResult = await runDay1GateWithHarness({
              baseUrl: FIXED_BASE_URL,
              allowedOrigins: [FIXED_BASE_URL],
              username: DEMO_USERNAME,
              password: DEMO_PASSWORD,
              inviteEmail,
              requirePersistedRow: true,
            });
            return { verdict: gateResult.verdict };
          }

          const loopResult = await runCriterion3WithHarness({
            baseUrl: FIXED_BASE_URL,
            username: DEMO_USERNAME,
            password: DEMO_PASSWORD,
            inviteEmail,
          });
          return { verdict: loopResult.verdict };
        },
      });

      expect(result.verdicts.map((entry) => entry.verdict)).toEqual([
        "PASS",
        "PASS",
        "PASS",
      ]);
      expect(result.readiness).toBe("READY");
    }, 300_000);
  });
});

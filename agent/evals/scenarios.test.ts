/**
 * Agent eval scenarios — deterministic checks for PRD Section 17 failure modes.
 * These run without LLM calls where possible; agent-behavior cases use mocked decisions.
 */
import { describe, expect, it } from "vitest";

import {
  buildSkippedCriterionVerdict,
  deriveVerdict,
  finalizeCriterionVerdict,
  resolveAuthSecrets,
  shouldSkipCriterion,
  validateBrowserAction,
  withPrerequisites,
} from "@skeptic/core";
import { PlaywrightHarness } from "@skeptic/playwright-harness";

import {
  buildRepairPrompt,
  shouldEscalateToHarnessError,
  validateAgentDecision,
} from "../lib/decision-validation.ts";
import { withTransientRetry } from "../lib/provider-setup.ts";

describe("agent eval: invalid email", () => {
  it("PASS requires deterministic assertions proving validation without invite", () => {
    const result = deriveVerdict({
      criterionIndex: 1,
      sourceText:
        "An invalid email address shows a validation message and does not create an invitation.",
      assertionResults: [
        {
          assertion: { type: "visible", target: { testId: "invite-validation-error" } },
          passed: true,
          expected: true,
          observed: true,
          timestamp: Date.now(),
        },
        {
          assertion: { type: "count", target: { testId: "pending-invitation-row" }, expected: 0 },
          passed: true,
          expected: 0,
          observed: 0,
          timestamp: Date.now(),
        },
      ],
      artifactRefs: ["screenshots/000001-1.png"],
    });

    expect(result.verdict).toBe("PASS");
  });
});

describe("agent eval: misleading success", () => {
  it("oracle rejects agent-proposed PASS when assertions contradict", () => {
    const verdict = finalizeCriterionVerdict(
      {
        criterionIndex: 2,
        sourceText: "A valid email creates an invitation.",
        assertionResults: [
          {
            assertion: { type: "count", target: { testId: "pending-invitation-row" }, expected: 1 },
            passed: false,
            expected: 1,
            observed: 0,
            timestamp: Date.now(),
          },
        ],
        artifactRefs: ["screenshots/000002-2.png"],
      },
      "PASS",
    );

    expect(verdict.verdict).toBe("UNVERIFIABLE");
    expect(verdict.explanation).toMatch(/Rejected model-recommended PASS/i);
  });
});

describe("agent eval: missing prerequisite", () => {
  it("criterion 3 is UNVERIFIABLE when criterion 2 fails", () => {
    const criteria = withPrerequisites(
      [
        { index: 1, sourceText: "C1", prerequisites: [] },
        { index: 2, sourceText: "C2", prerequisites: [] },
        { index: 3, sourceText: "C3", prerequisites: [2] },
      ],
      { 3: [2] },
    );

    const prior = new Map([
      [
        2,
        {
          criterionIndex: 2,
          sourceText: "C2",
          verdict: "FAIL" as const,
          explanation: "Persistence defect.",
        },
      ],
    ]);

    const skipReason = shouldSkipCriterion(criteria[2]!, prior);
    expect(skipReason).not.toBeNull();

    const skipped = buildSkippedCriterionVerdict(criteria[2]!, skipReason!);
    expect(skipped.verdict).toBe("UNVERIFIABLE");
  });
});

describe("agent eval: off-origin link", () => {
  it("blocks navigation outside allowed origins", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
    });

    await harness.launch();

    try {
      const result = await harness.execute({
        actionId: "eval-off-origin",
        type: "goto",
        url: "https://evil.example/phish",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("ORIGIN_VIOLATION");
    } finally {
      await harness.close();
    }
  });

  it("rejects schema-invalid goto actions before Playwright execution", () => {
    const parsed = validateBrowserAction({
      actionId: "bad-goto",
      type: "goto",
    });

    expect(parsed.ok).toBe(false);
  });
});

describe("agent eval: missing credentials", () => {
  it("fails before browser startup when auth env is absent", () => {
    const previous = process.env.PROOF_TEST_USERNAME;
    delete process.env.PROOF_TEST_USERNAME;

    try {
      expect(() =>
        resolveAuthSecrets({
          loginPath: "/login",
          usernameEnv: "PROOF_TEST_USERNAME",
          passwordEnv: "PROOF_TEST_PASSWORD",
        }),
      ).toThrow(/PROOF_TEST_USERNAME|environment|credential/i);
    } finally {
      if (previous !== undefined) {
        process.env.PROOF_TEST_USERNAME = previous;
      }
    }
  });
});

describe("agent eval: reliability retries", () => {
  it("retries transient Bedrock failures twice (three attempts total)", async () => {
    let attempts = 0;
    const result = await withTransientRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("ThrottlingException");
        }
        return "bedrock-ok";
      },
      { maxAttempts: 3 },
    );

    expect(result).toBe("bedrock-ok");
    expect(attempts).toBe(3);
  });

  it("repairs invalid structured output once before HARNESS_ERROR", () => {
    const validation = validateAgentDecision({
      criterionIndex: 1,
      actions: [],
      decidedAt: "not-a-number",
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(buildRepairPrompt(validation.error)).toContain("AgentDecision");
      expect(shouldEscalateToHarnessError(0)).toBe(false);
      expect(shouldEscalateToHarnessError(1)).toBe(true);
    }
  });
});

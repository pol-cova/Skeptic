import { describe, expect, it } from "vitest";

import {
  checkLoopLimits,
  createCriterionLoopState,
  DEFAULT_CRITERION_LOOP_LIMITS,
  finalizeExhaustedCriterion,
  recordLoopStep,
  validateBrowserAction,
} from "./verification-loop.ts";

describe("verification loop", () => {
  it("rejects unknown actions before they can reach Playwright", () => {
    const validation = validateBrowserAction({
      actionId: "bad",
      type: "click",
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.length).toBeGreaterThan(0);
    }
  });

  it("accepts typed browser actions", () => {
    const validation = validateBrowserAction({
      actionId: "goto-login",
      type: "goto",
      url: "http://127.0.0.1:3100/login",
    });

    expect(validation.ok).toBe(true);
  });

  it("exhausts on step count", () => {
    let state = createCriterionLoopState({
      criterionIndex: 1,
      hypothesis: "Invalid email shows validation.",
      startedAt: 1_000,
    });

    for (
      let step = 0;
      step < DEFAULT_CRITERION_LOOP_LIMITS.maxSteps;
      step += 1
    ) {
      state = recordLoopStep(state).state;
    }

    const status = checkLoopLimits(state, DEFAULT_CRITERION_LOOP_LIMITS, 2_000);
    expect(status.exhausted).toBe(true);
    expect(status.reason).toBe("steps");
  });

  it("returns UNVERIFIABLE on exhaustion without contradictory evidence", () => {
    const verdict = finalizeExhaustedCriterion(
      {
        criterionIndex: 2,
        sourceText: "Example criterion",
        assertionResults: [],
        artifactRefs: [],
      },
      "steps",
    );

    expect(verdict.verdict).toBe("UNVERIFIABLE");
  });

  it("preserves FAIL when contradictory evidence exists at exhaustion", () => {
    const verdict = finalizeExhaustedCriterion(
      {
        criterionIndex: 2,
        sourceText: "Example criterion",
        assertionResults: [
          {
            assertion: {
              type: "count",
              target: { testId: "pending-invitation-row" },
              expected: 1,
            },
            passed: false,
            expected: "1",
            observed: "0",
            timestamp: Date.now(),
          },
        ],
        artifactRefs: ["screenshots/000001-2.png"],
      },
      "duration",
    );

    expect(verdict.verdict).toBe("FAIL");
  });
});

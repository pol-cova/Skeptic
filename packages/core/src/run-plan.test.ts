import { describe, expect, it } from "vitest";

import type { Criterion } from "./schemas/criterion.ts";
import {
  aggregateRunReadiness,
  buildSkippedCriterionVerdict,
  executeRunPlan,
  findBlockingPrerequisite,
  shouldSkipCriterion,
} from "./run-plan.ts";

const demoCriteria: Criterion[] = [
  {
    index: 1,
    sourceText:
      "An invalid email address shows a validation message and does not create an invitation.",
    prerequisites: [],
  },
  {
    index: 2,
    sourceText:
      "A valid email address creates an invitation and displays it in the Pending invitations list.",
    prerequisites: [],
  },
  {
    index: 3,
    sourceText:
      "Inviting the same email twice shows a duplicate-invitation error and does not create a second row.",
    prerequisites: [2],
  },
];

describe("run plan prerequisites", () => {
  it("skips criterion 3 when criterion 2 fails", async () => {
    const result = await executeRunPlan({
      criteria: demoCriteria,
      async executeCriterion(criterion) {
        if (criterion.index === 1) {
          return {
            verdict: {
              criterionIndex: 1,
              sourceText: criterion.sourceText,
              verdict: "PASS",
              explanation: "Validation message observed.",
              assertionResults: [],
              artifactRefs: ["screenshots/000001-1.png"],
            },
          };
        }

        if (criterion.index === 2) {
          return {
            verdict: {
              criterionIndex: 2,
              sourceText: criterion.sourceText,
              verdict: "FAIL",
              explanation: "Invitation did not persist after reload.",
              assertionResults: [],
              artifactRefs: ["screenshots/000001-2.png"],
            },
          };
        }

        throw new Error("Criterion 3 should have been skipped.");
      },
    });

    expect(result.verdicts).toHaveLength(3);
    expect(result.verdicts[2]?.verdict).toBe("UNVERIFIABLE");
    expect(result.verdicts[2]?.prerequisiteFailure?.index).toBe(2);
    expect(result.readiness).toBe("NOT_READY");
  });

  it("marks dependent criteria UNVERIFIABLE when credentials are missing", async () => {
    const result = await executeRunPlan({
      criteria: demoCriteria,
      context: {
        credentialAvailability: {
          username: null,
          password: null,
        },
      },
      async executeCriterion() {
        throw new Error(
          "Browser execution should not run without credentials.",
        );
      },
    });

    expect(
      result.verdicts.every((entry) => entry.verdict === "UNVERIFIABLE"),
    ).toBe(true);
    expect(result.readiness).toBe("INCOMPLETE");
  });

  it("returns INCOMPLETE only when no FAIL or HARNESS_ERROR is present", () => {
    expect(
      aggregateRunReadiness(["PASS", "UNVERIFIABLE", "UNVERIFIABLE"]),
    ).toBe("INCOMPLETE");
    expect(aggregateRunReadiness(["PASS", "UNVERIFIABLE", "FAIL"])).toBe(
      "NOT_READY",
    );
    expect(aggregateRunReadiness(["HARNESS_ERROR", "UNVERIFIABLE"])).toBe(
      "ERROR",
    );
  });

  it("builds skipped verdicts with prerequisite metadata", () => {
    const skipped = buildSkippedCriterionVerdict(demoCriteria[2]!, {
      index: 2,
      reason: "Prerequisite 2 returned FAIL.",
    });

    expect(skipped.verdict).toBe("UNVERIFIABLE");
    expect(skipped.prerequisiteFailure?.reason).toContain("FAIL");
  });

  it("detects missing prerequisite evaluations", () => {
    const failure = findBlockingPrerequisite(demoCriteria[2]!, new Map());
    expect(failure?.index).toBe(2);
  });

  it("does not skip when prerequisites passed", () => {
    const prior = new Map([
      [
        2,
        {
          criterionIndex: 2,
          sourceText: demoCriteria[1]!.sourceText,
          verdict: "PASS" as const,
          explanation: "Invitation persisted.",
          assertionResults: [],
          artifactRefs: [],
        },
      ],
    ]);

    expect(shouldSkipCriterion(demoCriteria[2]!, prior)).toBeNull();
  });
});

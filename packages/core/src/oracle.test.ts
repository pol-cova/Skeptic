import { describe, expect, it } from "vitest";

import { exitCodeFor, readinessFor, type Verdict } from "./contracts.ts";
import type { AssertionResult } from "./schemas/assertion.ts";
import {
  aggregateReadiness,
  deriveVerdict,
  finalizeCriterionVerdict,
  validatePassConstraints,
} from "./oracle.ts";

const baseInput = {
  criterionIndex: 1,
  sourceText: "Example criterion",
};

function assertionResult(
  type: AssertionResult["assertion"]["type"],
  passed: boolean,
  overrides: Partial<AssertionResult> = {},
): AssertionResult {
  const timestamp = 1_700_000_000_000;
  const assertionByType = {
    visible: { type: "visible" as const, target: { testId: "target" } },
    hidden: { type: "hidden" as const, target: { testId: "target" } },
    text: {
      type: "text" as const,
      target: { testId: "target" },
      expected: "hello",
    },
    count: {
      type: "count" as const,
      target: { testId: "rows" },
      expected: 1,
    },
    url: { type: "url" as const, expected: "https://example.com/team" },
    response: {
      type: "response" as const,
      method: "POST",
      path: "/api/invitations",
      status: 201,
    },
  };

  return {
    assertion: assertionByType[type],
    passed,
    expected: passed ? "ok" : "mismatch",
    observed: passed ? "ok" : "mismatch",
    timestamp,
    ...overrides,
  };
}

describe("deriveVerdict", () => {
  it("maps every assertion type to PASS when successful with artifacts", () => {
    const types = [
      "visible",
      "hidden",
      "text",
      "count",
      "url",
      "response",
    ] as const;

    for (const type of types) {
      const result = deriveVerdict({
        ...baseInput,
        assertionResults: [assertionResult(type, true)],
        artifactRefs: ["screenshots/000001-1.png"],
      });
      expect(result.verdict).toBe("PASS");
    }
  });

  it("maps failed assertions to FAIL with contradictory evidence", () => {
    const result = deriveVerdict({
      ...baseInput,
      assertionResults: [
        assertionResult("visible", true),
        assertionResult("count", false, {
          expected: 1,
          observed: 0,
        }),
      ],
      artifactRefs: ["screenshots/000002-1.png"],
    });

    expect(result.verdict).toBe("FAIL");
    expect(result.explanation).toContain("contradicts");
  });

  it("returns UNVERIFIABLE for missing prerequisites", () => {
    const result = deriveVerdict({
      ...baseInput,
      prerequisiteFailure: {
        index: 1,
        reason: "Login screen unavailable",
      },
      assertionResults: [],
    });

    expect(result.verdict).toBe("UNVERIFIABLE");
    expect(result.prerequisiteFailure?.reason).toContain("Login");
  });

  it("returns HARNESS_ERROR for infrastructure failures", () => {
    const result = deriveVerdict({
      ...baseInput,
      harnessFailure: {
        code: "BROWSER_CRASH",
        message: "Chromium exited unexpectedly",
      },
      assertionResults: [assertionResult("visible", true)],
    });

    expect(result.verdict).toBe("HARNESS_ERROR");
  });

  it("rejects PASS when assertions pass but artifacts are missing", () => {
    const result = deriveVerdict({
      ...baseInput,
      assertionResults: [assertionResult("text", true)],
      artifactRefs: [],
    });

    expect(result.verdict).toBe("UNVERIFIABLE");
    expect(result.explanation).toContain("artifact");
  });

  it("returns UNVERIFIABLE when no assertions were recorded", () => {
    const result = deriveVerdict({
      ...baseInput,
      assertionResults: [],
    });

    expect(result.verdict).toBe("UNVERIFIABLE");
  });

  it("collects artifact refs from assertion results", () => {
    const result = deriveVerdict({
      ...baseInput,
      assertionResults: [
        assertionResult("visible", true, {
          artifactRefs: ["screenshots/000001-1.png"],
        }),
      ],
    });

    expect(result.verdict).toBe("PASS");
    expect(result.artifactRefs).toEqual(["screenshots/000001-1.png"]);
  });
});

describe("validatePassConstraints", () => {
  it("requires successful assertions and persisted artifacts", () => {
    expect(
      validatePassConstraints({
        assertionResults: [assertionResult("visible", true)],
        artifactRefs: ["screenshots/000001-1.png"],
      }).ok,
    ).toBe(true);

    expect(
      validatePassConstraints({
        assertionResults: [assertionResult("visible", false)],
        artifactRefs: ["screenshots/000001-1.png"],
      }).ok,
    ).toBe(false);

    expect(
      validatePassConstraints({
        assertionResults: [assertionResult("visible", true)],
        artifactRefs: [],
      }).ok,
    ).toBe(false);
  });
});

describe("finalizeCriterionVerdict", () => {
  it("rejects a model-recommended PASS without artifacts", () => {
    const verdict = finalizeCriterionVerdict(
      {
        ...baseInput,
        assertionResults: [assertionResult("count", true)],
        artifactRefs: [],
      },
      "PASS",
    );

    expect(verdict.verdict).toBe("UNVERIFIABLE");
    expect(verdict.explanation).toContain("Rejected model-recommended PASS");
  });

  it("rejects a model-recommended FAIL without contradictory evidence", () => {
    const verdict = finalizeCriterionVerdict(
      {
        ...baseInput,
        assertionResults: [assertionResult("count", true)],
        artifactRefs: ["screenshots/000001-1.png"],
      },
      "FAIL",
    );

    expect(verdict.verdict).toBe("UNVERIFIABLE");
    expect(verdict.explanation).toContain("Rejected model-recommended FAIL");
  });
});

describe("readiness aggregation", () => {
  const combinations: Array<{ verdicts: Verdict[]; readiness: string }> = [
    { verdicts: ["PASS"], readiness: "READY" },
    { verdicts: ["PASS", "FAIL"], readiness: "NOT_READY" },
    { verdicts: ["FAIL", "UNVERIFIABLE"], readiness: "INCOMPLETE" },
    { verdicts: ["UNVERIFIABLE", "HARNESS_ERROR"], readiness: "ERROR" },
    { verdicts: ["PASS", "FAIL", "UNVERIFIABLE"], readiness: "INCOMPLETE" },
    {
      verdicts: ["PASS", "FAIL", "UNVERIFIABLE", "HARNESS_ERROR"],
      readiness: "ERROR",
    },
  ];

  it.each(combinations)(
    "derives $readiness from $verdicts",
    ({ verdicts, readiness }) => {
      expect(readinessFor(verdicts)).toBe(readiness);
      expect(aggregateReadiness(verdicts)).toBe(readiness);
      expect(exitCodeFor(readiness as "READY")).toBeDefined();
    },
  );
});

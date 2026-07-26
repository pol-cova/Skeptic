import { readinessFor, type Readiness, type Verdict } from "./contracts.ts";
import type { AssertionResult } from "./schemas/assertion.ts";
import type {
  CriterionVerdict,
  PrerequisiteFailure,
} from "./schemas/verdict.ts";

export interface HarnessFailure {
  code: string;
  message: string;
}

export interface OracleInput {
  criterionIndex: number;
  sourceText: string;
  assertionResults: readonly AssertionResult[];
  artifactRefs?: readonly string[];
  prerequisiteFailure?: PrerequisiteFailure;
  harnessFailure?: HarnessFailure;
}

export interface OracleResult {
  verdict: Verdict;
  explanation: string;
  assertionResults: AssertionResult[];
  artifactRefs: string[];
  prerequisiteFailure?: PrerequisiteFailure;
}

function uniqueArtifactRefs(
  assertionResults: readonly AssertionResult[],
  artifactRefs: readonly string[] | undefined,
): string[] {
  const refs = new Set<string>();
  for (const ref of artifactRefs ?? []) {
    if (ref.trim().length > 0) {
      refs.add(ref);
    }
  }
  for (const result of assertionResults) {
    for (const ref of result.artifactRefs ?? []) {
      if (ref.trim().length > 0) {
        refs.add(ref);
      }
    }
  }
  return [...refs];
}

function hasContradictoryEvidence(
  assertionResults: readonly AssertionResult[],
): boolean {
  return assertionResults.some((result) => !result.passed);
}

function hasSuccessfulAssertions(
  assertionResults: readonly AssertionResult[],
): boolean {
  return (
    assertionResults.length > 0 &&
    assertionResults.every((result) => result.passed)
  );
}

function formatAssertionSummary(results: readonly AssertionResult[]): string {
  return results
    .map((result) => {
      const status = result.passed ? "passed" : "failed";
      return `${result.assertion.type} ${status}`;
    })
    .join(", ");
}

/**
 * Rejects a model-recommended PASS when deterministic evidence is incomplete.
 */
export function validatePassConstraints(input: {
  assertionResults: readonly AssertionResult[];
  artifactRefs: readonly string[];
}): { ok: true } | { ok: false; reason: string } {
  if (!hasSuccessfulAssertions(input.assertionResults)) {
    return {
      ok: false,
      reason: "PASS requires at least one successful deterministic assertion.",
    };
  }

  if (input.artifactRefs.length === 0) {
    return {
      ok: false,
      reason: "PASS requires at least one persisted artifact reference.",
    };
  }

  return { ok: true };
}

/**
 * Maps assertion results and evidence linkage to a four-state verdict.
 * Model prose cannot override missing assertions or artifacts.
 */
export function deriveVerdict(input: OracleInput): OracleResult {
  const assertionResults = [...input.assertionResults];
  const artifactRefs = uniqueArtifactRefs(assertionResults, input.artifactRefs);

  if (input.harnessFailure) {
    return {
      verdict: "HARNESS_ERROR",
      explanation: `Harness failure (${input.harnessFailure.code}): ${input.harnessFailure.message}`,
      assertionResults,
      artifactRefs,
      ...(input.prerequisiteFailure
        ? { prerequisiteFailure: input.prerequisiteFailure }
        : {}),
    };
  }

  if (input.prerequisiteFailure) {
    return {
      verdict: "UNVERIFIABLE",
      explanation: `Prerequisite ${input.prerequisiteFailure.index} missing: ${input.prerequisiteFailure.reason}`,
      assertionResults,
      artifactRefs,
      prerequisiteFailure: input.prerequisiteFailure,
    };
  }

  if (assertionResults.length === 0) {
    return {
      verdict: "UNVERIFIABLE",
      explanation:
        "No deterministic assertions were recorded for this criterion.",
      assertionResults,
      artifactRefs,
    };
  }

  if (hasContradictoryEvidence(assertionResults)) {
    const failed = assertionResults.filter((result) => !result.passed);
    return {
      verdict: "FAIL",
      explanation: `Observed evidence contradicts the criterion (${formatAssertionSummary(failed)}).`,
      assertionResults,
      artifactRefs,
    };
  }

  const passValidation = validatePassConstraints({
    assertionResults,
    artifactRefs,
  });

  if (!passValidation.ok) {
    return {
      verdict: "UNVERIFIABLE",
      explanation: passValidation.reason,
      assertionResults,
      artifactRefs,
    };
  }

  return {
    verdict: "PASS",
    explanation: `Deterministic assertions prove the criterion (${formatAssertionSummary(assertionResults)}).`,
    assertionResults,
    artifactRefs,
  };
}

/**
 * Builds a criterion verdict from oracle output, rejecting proposed PASS values
 * that lack assertions or persisted artifacts.
 */
export function finalizeCriterionVerdict(
  input: OracleInput,
  proposedVerdict?: Verdict,
): CriterionVerdict {
  const oracle = deriveVerdict(input);

  if (proposedVerdict === undefined || proposedVerdict === oracle.verdict) {
    return {
      criterionIndex: input.criterionIndex,
      sourceText: input.sourceText,
      verdict: oracle.verdict,
      explanation: oracle.explanation,
      assertionResults: oracle.assertionResults,
      artifactRefs: oracle.artifactRefs,
      ...(oracle.prerequisiteFailure
        ? { prerequisiteFailure: oracle.prerequisiteFailure }
        : {}),
    };
  }

  if (proposedVerdict === "PASS") {
    const validation = validatePassConstraints({
      assertionResults: oracle.assertionResults,
      artifactRefs: oracle.artifactRefs,
    });
    if (!validation.ok) {
      return {
        criterionIndex: input.criterionIndex,
        sourceText: input.sourceText,
        verdict: "UNVERIFIABLE",
        explanation: `Rejected model-recommended PASS: ${validation.reason}`,
        assertionResults: oracle.assertionResults,
        artifactRefs: oracle.artifactRefs,
      };
    }
  }

  if (
    proposedVerdict === "FAIL" &&
    !hasContradictoryEvidence(oracle.assertionResults)
  ) {
    return {
      criterionIndex: input.criterionIndex,
      sourceText: input.sourceText,
      verdict: "UNVERIFIABLE",
      explanation:
        "Rejected model-recommended FAIL: no contradictory deterministic evidence was observed.",
      assertionResults: oracle.assertionResults,
      artifactRefs: oracle.artifactRefs,
    };
  }

  return {
    criterionIndex: input.criterionIndex,
    sourceText: input.sourceText,
    verdict: oracle.verdict,
    explanation: oracle.explanation,
    assertionResults: oracle.assertionResults,
    artifactRefs: oracle.artifactRefs,
    ...(oracle.prerequisiteFailure
      ? { prerequisiteFailure: oracle.prerequisiteFailure }
      : {}),
  };
}

export function aggregateReadiness(verdicts: readonly Verdict[]): Readiness {
  return readinessFor(verdicts);
}

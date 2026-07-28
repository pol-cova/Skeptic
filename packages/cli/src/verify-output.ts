import type { CriterionVerdict } from "@skeptic/core";
import type { VerifyResult } from "./verify-runner.ts";

export interface VerifyOutputOptions {
  verbose?: boolean;
}

function summarizeAssertion(
  result: NonNullable<CriterionVerdict["assertionResults"]>[number],
) {
  return {
    type: result.assertion.type,
    passed: result.passed,
    expected: result.expected,
    observed: result.observed,
    artifactRefs: result.artifactRefs,
  };
}

export function formatVerifyPayload(
  result: VerifyResult,
  options: VerifyOutputOptions = {},
): Record<string, unknown> {
  const verbose = options.verbose ?? true;
  const payload: Record<string, unknown> = {
    runId: result.runId,
    readiness: result.readiness,
    exitCode: result.exitCode,
    artifactRoot: result.artifactRoot,
    verdicts: verbose
      ? result.verdicts.map((entry) => ({
          criterionIndex: entry.criterionIndex,
          verdict: entry.verdict,
          explanation: entry.explanation,
          sourceText: entry.sourceText,
          prerequisiteFailure: entry.prerequisiteFailure,
          assertionResults: (entry.assertionResults ?? []).map(
            summarizeAssertion,
          ),
          artifactRefs: entry.artifactRefs,
        }))
      : result.verdicts.map((entry) => ({
          criterionIndex: entry.criterionIndex,
          verdict: entry.verdict,
        })),
  };

  if (result.fixPromptPath) {
    payload.fixPromptPath = result.fixPromptPath;
  }

  return payload;
}

export function formatStructuredError(
  category: string,
  message: string,
): Record<string, unknown> {
  return {
    ok: false,
    error: {
      category,
      message,
    },
    exitCode: 3,
  };
}

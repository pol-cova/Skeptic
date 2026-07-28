import type { AssertionResult } from "./schemas/assertion.ts";
import { browserActionSchema, type BrowserAction } from "./schemas/browser.ts";
import { finalizeCriterionVerdict, type OracleInput } from "./oracle.ts";
import type { CriterionVerdict } from "./schemas/verdict.ts";

export const MAX_STEPS_PER_CRITERION = 20;
export const MAX_DURATION_MS_PER_CRITERION = 180_000;
export const MAX_INFERENCE_ATTEMPTS_PER_CRITERION = 10;

export interface CriterionLoopLimits {
  maxSteps: number;
  maxDurationMs: number;
  maxInferenceAttempts: number;
}

export const DEFAULT_CRITERION_LOOP_LIMITS: CriterionLoopLimits = {
  maxSteps: MAX_STEPS_PER_CRITERION,
  maxDurationMs: MAX_DURATION_MS_PER_CRITERION,
  maxInferenceAttempts: MAX_INFERENCE_ATTEMPTS_PER_CRITERION,
};

export interface CriterionLoopState {
  criterionIndex: number;
  hypothesis: string;
  startedAt: number;
  stepCount: number;
  inferenceCount: number;
}

export type LoopLimitReason = "steps" | "duration" | "inference";

export interface LoopLimitStatus {
  exhausted: boolean;
  reason?: LoopLimitReason;
}

export type ActionValidationResult =
  | { ok: true; action: BrowserAction }
  | { ok: false; error: string };

export function createCriterionLoopState(input: {
  criterionIndex: number;
  hypothesis: string;
  startedAt?: number;
}): CriterionLoopState {
  return {
    criterionIndex: input.criterionIndex,
    hypothesis: input.hypothesis,
    startedAt: input.startedAt ?? Date.now(),
    stepCount: 0,
    inferenceCount: 0,
  };
}

export function validateBrowserAction(input: unknown): ActionValidationResult {
  const parsed = browserActionSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, action: parsed.data };
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return {
    ok: false,
    error: issues.join("; "),
  };
}

export function recordLoopStep(
  state: CriterionLoopState,
  limits: CriterionLoopLimits = DEFAULT_CRITERION_LOOP_LIMITS,
): { state: CriterionLoopState; limitStatus: LoopLimitStatus } {
  const nextState: CriterionLoopState = {
    ...state,
    stepCount: state.stepCount + 1,
  };

  return {
    state: nextState,
    limitStatus: checkLoopLimits(nextState, limits),
  };
}

export function recordInferenceAttempt(
  state: CriterionLoopState,
  limits: CriterionLoopLimits = DEFAULT_CRITERION_LOOP_LIMITS,
): { state: CriterionLoopState; limitStatus: LoopLimitStatus } {
  const nextState: CriterionLoopState = {
    ...state,
    inferenceCount: state.inferenceCount + 1,
  };

  return {
    state: nextState,
    limitStatus: checkLoopLimits(nextState, limits),
  };
}

export function checkLoopLimits(
  state: CriterionLoopState,
  limits: CriterionLoopLimits = DEFAULT_CRITERION_LOOP_LIMITS,
  now = Date.now(),
): LoopLimitStatus {
  if (state.stepCount >= limits.maxSteps) {
    return { exhausted: true, reason: "steps" };
  }

  if (now - state.startedAt >= limits.maxDurationMs) {
    return { exhausted: true, reason: "duration" };
  }

  if (state.inferenceCount >= limits.maxInferenceAttempts) {
    return { exhausted: true, reason: "inference" };
  }

  return { exhausted: false };
}

function hasContradictoryEvidence(
  assertionResults: readonly AssertionResult[],
): boolean {
  return assertionResults.some((result) => !result.passed);
}

/**
 * Step or time exhaustion becomes UNVERIFIABLE unless contradictory evidence
 * already proves FAIL.
 */
export function finalizeExhaustedCriterion(
  input: OracleInput,
  limitReason: LoopLimitReason,
): CriterionVerdict {
  const hasFailEvidence = hasContradictoryEvidence(input.assertionResults);
  const verdict = finalizeCriterionVerdict(input);

  return {
    ...verdict,
    explanation: exhaustionExplanation(limitReason, hasFailEvidence),
  };
}

export function exhaustionExplanation(
  limitReason: LoopLimitReason,
  hasFailEvidence: boolean,
): string {
  if (hasFailEvidence) {
    return "Loop limits reached after contradictory evidence was observed.";
  }

  const reasonLabel =
    limitReason === "steps"
      ? "the maximum step count"
      : limitReason === "duration"
        ? "the per-criterion time limit"
        : "the inference attempt limit";

  return `Verification stopped because ${reasonLabel} was reached before deterministic evidence could be collected.`;
}

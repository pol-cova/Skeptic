import type { ProofConfig } from "./config.schema.ts";
import {
  DEFAULT_CRITERION_LOOP_LIMITS,
  type CriterionLoopLimits,
} from "./verification-loop.ts";

export function resolveLoopLimits(config?: ProofConfig): CriterionLoopLimits {
  const overrides = config?.limits;
  if (!overrides) {
    return DEFAULT_CRITERION_LOOP_LIMITS;
  }

  return {
    maxSteps: overrides.maxSteps ?? DEFAULT_CRITERION_LOOP_LIMITS.maxSteps,
    maxDurationMs:
      overrides.maxDurationMs ?? DEFAULT_CRITERION_LOOP_LIMITS.maxDurationMs,
    maxInferenceAttempts:
      overrides.maxInferenceAttempts ??
      DEFAULT_CRITERION_LOOP_LIMITS.maxInferenceAttempts,
  };
}

import { z } from "zod";

export const verdictSchema = z.enum([
  "PASS",
  "FAIL",
  "UNVERIFIABLE",
  "HARNESS_ERROR",
]);

export type Verdict = z.infer<typeof verdictSchema>;

export const readinessSchema = z.enum([
  "READY",
  "NOT_READY",
  "INCOMPLETE",
  "ERROR",
]);

export type Readiness = z.infer<typeof readinessSchema>;

export const criterionResultSchema = z.object({
  criterion: z.string().min(1),
  verdict: verdictSchema,
  explanation: z.string().min(1),
});

export type CriterionResult = z.infer<typeof criterionResultSchema>;

const exitCodes = {
  READY: 0,
  NOT_READY: 1,
  INCOMPLETE: 2,
  ERROR: 3,
} as const satisfies Record<Readiness, 0 | 1 | 2 | 3>;

export function readinessFor(verdicts: readonly Verdict[]): Readiness {
  if (verdicts.includes("HARNESS_ERROR")) return "ERROR";
  if (verdicts.includes("UNVERIFIABLE")) return "INCOMPLETE";
  if (verdicts.includes("FAIL")) return "NOT_READY";
  return "READY";
}

export function exitCodeFor(readiness: Readiness): 0 | 1 | 2 | 3 {
  return exitCodes[readiness];
}

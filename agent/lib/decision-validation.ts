import { agentDecisionSchema, type AgentDecision } from "@skeptic/core";

export type AgentDecisionValidationResult =
  | { ok: true; decision: AgentDecision }
  | { ok: false; error: string; issues: string[] };

export function validateAgentDecision(
  input: unknown,
): AgentDecisionValidationResult {
  const parsed = agentDecisionSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, decision: parsed.data };
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );

  return {
    ok: false,
    error: issues.join("; "),
    issues,
  };
}

export function buildRepairPrompt(validationError: string): string {
  return [
    "Your previous structured output failed schema validation.",
    validationError,
    "Return one JSON object matching the AgentDecision schema:",
    "{ criterionIndex, actions[], rationale?, decidedAt }.",
  ].join(" ");
}

export function shouldEscalateToHarnessError(repairAttempts: number): boolean {
  return repairAttempts >= 1;
}

import {
  agentDecisionSchema,
  assertionResultSchema,
  finalizeCriterionVerdict,
  verdictSchema,
} from "@skeptic/core";
import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  buildRepairPrompt,
  validateAgentDecision,
} from "../lib/decision-validation.ts";
import { verificationSession } from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Finish the active criterion. Validates structured decisions and applies the deterministic oracle.",
  inputSchema: z.object({
    criterionIndex: z.number().int().positive(),
    sourceText: z.string().min(1),
    proposedVerdict: verdictSchema.optional(),
    explanation: z.string().min(1),
    decision: agentDecisionSchema.optional(),
    assertionResults: z.array(assertionResultSchema).default([]),
    artifactRefs: z.array(z.string()).default([]),
  }),
  async execute(input) {
    if (input.decision) {
      const validation = validateAgentDecision(input.decision);
      if (!validation.ok) {
        const attempts = verificationSession.get().repairAttempts;
        if (attempts >= 1) {
          return {
            ok: false,
            verdict: "HARNESS_ERROR" as const,
            explanation: `Invalid structured output after repair attempt: ${validation.error}`,
            repairPrompt: buildRepairPrompt(validation.error),
          };
        }

        verificationSession.update((current) => ({
          ...current,
          repairAttempts: current.repairAttempts + 1,
        }));

        return {
          ok: false,
          needsRepair: true,
          explanation: validation.error,
          repairPrompt: buildRepairPrompt(validation.error),
        };
      }
    }

    const verdict = finalizeCriterionVerdict(
      {
        criterionIndex: input.criterionIndex,
        sourceText: input.sourceText,
        assertionResults: input.assertionResults,
        artifactRefs: input.artifactRefs,
      },
      input.proposedVerdict,
    );

    return {
      ok: true,
      verdict: verdict.verdict,
      explanation: verdict.explanation,
      oracleExplanation: verdict.explanation,
      agentExplanation: input.explanation,
    };
  },
});

import {
  agentDecisionSchema,
  assertionResultSchema,
  finalizeCriterionVerdict,
  finalizeExhaustedCriterion,
  verdictSchema,
} from "@skeptic/core";
import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  buildRepairPrompt,
  validateAgentDecision,
} from "../lib/decision-validation.ts";
import {
  clearActiveCriterion,
  getActiveCriterionState,
  recordRecommendedVerdict,
  verificationSession,
} from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Finish the active criterion. Validates structured decisions and applies the deterministic oracle.",
  inputSchema: z.object({
    criterionIndex: z.number().int().positive(),
    sourceText: z.string().min(1),
    hypothesis: z.string().min(1).optional(),
    proposedVerdict: verdictSchema.optional(),
    explanation: z.string().min(1),
    decision: agentDecisionSchema.optional(),
    assertionResults: z.array(assertionResultSchema).default([]),
    artifactRefs: z.array(z.string()).default([]),
    limitReason: z.enum(["steps", "duration", "inference"]).optional(),
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

    const active = getActiveCriterionState();
    const assertionResults =
      input.assertionResults.length > 0
        ? input.assertionResults
        : (active?.assertionResults ?? []);
    const artifactRefs =
      input.artifactRefs.length > 0
        ? input.artifactRefs
        : (active?.artifactRefs ?? []);

    if (input.proposedVerdict) {
      recordRecommendedVerdict(input.proposedVerdict);
    }

    const oracleInput = {
      criterionIndex: input.criterionIndex,
      sourceText: input.sourceText,
      assertionResults,
      artifactRefs,
    };

    const verdict = input.limitReason
      ? finalizeExhaustedCriterion(oracleInput, input.limitReason)
      : finalizeCriterionVerdict(oracleInput, input.proposedVerdict);

    clearActiveCriterion();

    return {
      ok: true,
      recommendedVerdict: input.proposedVerdict,
      verdict: verdict.verdict,
      explanation: verdict.explanation,
      oracleExplanation: verdict.explanation,
      agentExplanation: input.explanation,
      hypothesis:
        input.hypothesis ??
        input.decision?.hypothesis ??
        active?.loop.hypothesis,
    };
  },
});

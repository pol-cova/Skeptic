import { z } from "zod";

import { verdictSchema } from "../contracts.ts";
import { assertionResultSchema } from "./assertion.ts";
import { browserActionSchema } from "./browser.ts";

export const agentDecisionSchema = z.object({
  criterionIndex: z.number().int().positive(),
  actions: z.array(browserActionSchema),
  rationale: z.string().min(1).optional(),
  decidedAt: z.number(),
});

export type AgentDecision = z.infer<typeof agentDecisionSchema>;

export const prerequisiteFailureSchema = z.object({
  index: z.number().int().positive(),
  reason: z.string().min(1),
});

export type PrerequisiteFailure = z.infer<typeof prerequisiteFailureSchema>;

export const criterionVerdictSchema = z.object({
  criterionIndex: z.number().int().positive(),
  sourceText: z.string().min(1),
  verdict: verdictSchema,
  explanation: z.string().min(1),
  assertionResults: z.array(assertionResultSchema).optional(),
  prerequisiteFailure: prerequisiteFailureSchema.optional(),
  artifactRefs: z.array(z.string()).optional(),
});

export type CriterionVerdict = z.infer<typeof criterionVerdictSchema>;

import { z } from "zod";

import { proofConfigSchema } from "../config.schema.ts";
import { readinessSchema } from "../contracts.ts";
import { criterionSchema } from "./criterion.ts";
import { criterionVerdictSchema } from "./verdict.ts";

export const runMetadataSchema = z.object({
  runId: z.string().min(1),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  readiness: readinessSchema.optional(),
  config: proofConfigSchema,
  criteria: z.array(criterionSchema).min(1),
  verdicts: z.array(criterionVerdictSchema).optional(),
  artifactRoot: z.string().min(1),
});

export type RunMetadata = z.infer<typeof runMetadataSchema>;

export const persistedRunBundleSchema = z.object({
  metadata: runMetadataSchema,
  events: z.array(
    z.object({
      runId: z.string().min(1),
      sequence: z.number().int().nonnegative(),
      timestamp: z.number(),
      actor: z.enum(["agent", "harness", "oracle", "system"]),
      type: z.string().min(1),
      payload: z.record(z.string(), z.unknown()),
      criterionIndex: z.number().int().positive().optional(),
      artifactRefs: z.array(z.string()).optional(),
    }),
  ),
});

export type PersistedRunBundle = z.infer<typeof persistedRunBundleSchema>;

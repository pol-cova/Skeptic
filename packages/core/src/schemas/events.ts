import { z } from "zod";

export const runEventActorSchema = z.enum([
  "agent",
  "harness",
  "oracle",
  "system",
]);

export type RunEventActor = z.infer<typeof runEventActorSchema>;

export const runEventSchema = z.object({
  runId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  timestamp: z.number(),
  actor: runEventActorSchema,
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  criterionIndex: z.number().int().positive().optional(),
  artifactRefs: z.array(z.string()).optional(),
});

export type RunEvent = z.infer<typeof runEventSchema>;

export const runStartedEventSchema = runEventSchema.extend({
  type: z.literal("run.started"),
  payload: z.object({
    configPath: z.string().optional(),
    criteriaCount: z.number().int().nonnegative(),
  }),
});

export const browserActionEventSchema = runEventSchema.extend({
  type: z.literal("browser.action"),
  payload: z.object({
    actionId: z.string().min(1),
    actionType: z.string().min(1),
  }),
});

export const assertionCheckedEventSchema = runEventSchema.extend({
  type: z.literal("assertion.checked"),
  payload: z.object({
    passed: z.boolean(),
    assertionType: z.string().min(1),
  }),
});

export const criterionCompletedEventSchema = runEventSchema.extend({
  type: z.literal("criterion.completed"),
  payload: z.object({
    verdict: z.string().min(1),
  }),
});

export const runEventVariantsSchema = z.discriminatedUnion("type", [
  runStartedEventSchema,
  browserActionEventSchema,
  assertionCheckedEventSchema,
  criterionCompletedEventSchema,
]);

export type RunEventVariant = z.infer<typeof runEventVariantsSchema>;

import { z } from "zod";

import { elementTargetSchema } from "./target.ts";

export const visibleAssertionSchema = z.object({
  type: z.literal("visible"),
  target: elementTargetSchema,
});

export const hiddenAssertionSchema = z.object({
  type: z.literal("hidden"),
  target: elementTargetSchema,
});

export const textAssertionSchema = z.object({
  type: z.literal("text"),
  target: elementTargetSchema,
  expected: z.string(),
});

export const countAssertionSchema = z.object({
  type: z.literal("count"),
  target: elementTargetSchema,
  expected: z.number().int().nonnegative(),
});

export const urlAssertionSchema = z.object({
  type: z.literal("url"),
  expected: z.url(),
});

export const responseAssertionSchema = z.object({
  type: z.literal("response"),
  method: z.string().min(1),
  path: z.string().min(1),
  status: z.number().int(),
});

export const assertionSchema = z.discriminatedUnion("type", [
  visibleAssertionSchema,
  hiddenAssertionSchema,
  textAssertionSchema,
  countAssertionSchema,
  urlAssertionSchema,
  responseAssertionSchema,
]);

export type Assertion = z.infer<typeof assertionSchema>;

export const assertionResultSchema = z.object({
  assertion: assertionSchema,
  passed: z.boolean(),
  expected: z.unknown(),
  observed: z.unknown(),
  timestamp: z.number(),
  artifactRefs: z.array(z.string()).optional(),
});

export type AssertionResult = z.infer<typeof assertionResultSchema>;

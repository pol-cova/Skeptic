import { z } from "zod";

import { assertionSchema } from "./assertion.ts";
import { elementTargetSchema } from "./target.ts";

export { elementTargetSchema, type ElementTarget } from "./target.ts";

export const accessibleElementSchema = z.object({
  role: z.string().min(1),
  name: z.string().optional(),
  testId: z.string().optional(),
  value: z.string().optional(),
  checked: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

export type AccessibleElement = z.infer<typeof accessibleElementSchema>;

export const networkObservationSchema = z.object({
  method: z.string().min(1),
  path: z.string().min(1),
  status: z.number().int(),
});

export type NetworkObservation = z.infer<typeof networkObservationSchema>;

export const pageObservationSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
  elements: z.array(accessibleElementSchema),
  errors: z.array(z.string()).optional(),
  network: z.array(networkObservationSchema).optional(),
  capturedAt: z.number(),
});

export type PageObservation = z.infer<typeof pageObservationSchema>;

const browserActionBaseSchema = z.object({
  actionId: z.string().min(1),
});

export const gotoActionSchema = browserActionBaseSchema.extend({
  type: z.literal("goto"),
  url: z.url(),
});

export const clickActionSchema = browserActionBaseSchema.extend({
  type: z.literal("click"),
  target: elementTargetSchema,
});

export const fillActionSchema = browserActionBaseSchema.extend({
  type: z.literal("fill"),
  target: elementTargetSchema,
  value: z.string(),
});

export const selectActionSchema = browserActionBaseSchema.extend({
  type: z.literal("select"),
  target: elementTargetSchema,
  value: z.string(),
});

export const pressActionSchema = browserActionBaseSchema.extend({
  type: z.literal("press"),
  key: z.string().min(1),
  target: elementTargetSchema.optional(),
});

export const waitForActionSchema = browserActionBaseSchema.extend({
  type: z.literal("waitFor"),
  target: elementTargetSchema.optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const assertActionSchema = browserActionBaseSchema.extend({
  type: z.literal("assert"),
  assertion: assertionSchema,
});

export const browserActionSchema = z.discriminatedUnion("type", [
  gotoActionSchema,
  clickActionSchema,
  fillActionSchema,
  selectActionSchema,
  pressActionSchema,
  waitForActionSchema,
  assertActionSchema,
]);

export type BrowserAction = z.infer<typeof browserActionSchema>;

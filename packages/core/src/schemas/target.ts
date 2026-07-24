import { z } from "zod";

export const elementTargetSchema = z
  .object({
    testId: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    placeholder: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  })
  .refine(
    (target) =>
      target.testId !== undefined ||
      target.role !== undefined ||
      target.name !== undefined ||
      target.label !== undefined ||
      target.placeholder !== undefined ||
      target.text !== undefined,
    "An element target requires at least one locator field.",
  );

export type ElementTarget = z.infer<typeof elementTargetSchema>;

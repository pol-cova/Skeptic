import { z } from "zod";

export const criterionSchema = z.object({
  index: z.number().int().positive(),
  sourceText: z.string().min(1),
  prerequisites: z.array(z.number().int().positive()).default([]),
});

export type Criterion = z.infer<typeof criterionSchema>;

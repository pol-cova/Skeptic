import { z } from "zod";

import { browserActionSchema } from "./browser.ts";

export const REPLAY_FIXTURE_VERSION = 1 as const;

export const replayApiStepSchema = z.object({
  type: z.literal("api"),
  method: z.enum(["POST", "GET"]),
  path: z.string().min(1),
});

export type ReplayApiStep = z.infer<typeof replayApiStepSchema>;

export const replayCriterionSchema = z.object({
  criterionIndex: z.number().int().positive(),
  sourceText: z.string().min(1),
  beforeSteps: z.array(replayApiStepSchema).optional(),
  steps: z.array(browserActionSchema).min(1),
});

export type ReplayCriterion = z.infer<typeof replayCriterionSchema>;

export const replayFixtureSchema = z.object({
  version: z.literal(REPLAY_FIXTURE_VERSION),
  baseUrl: z.url(),
  allowedOrigins: z.array(z.string().min(1)).min(1),
  variables: z.record(z.string(), z.string()).optional(),
  criteria: z.array(replayCriterionSchema).min(1),
  generatedAt: z.number(),
});

export type ReplayFixture = z.infer<typeof replayFixtureSchema>;

export class ReplayGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayGenerationError";
  }
}

/**
 * Validates that every action uses only stable target vocabulary fields.
 */
export function assertReplayableActions(steps: readonly unknown[]): void {
  const parsed = z.array(browserActionSchema).safeParse(steps);
  if (!parsed.success) {
    throw new ReplayGenerationError(
      `Unsupported trace: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  for (const action of parsed.data) {
    if (action.type === "assert") {
      const assertion = action.assertion;
      if (assertion.type === "url" || assertion.type === "response") {
        continue;
      }
      assertStableTarget(assertion.target);
      continue;
    }

    if ("target" in action && action.target !== undefined) {
      assertStableTarget(action.target);
    }
  }
}

function assertStableTarget(target: {
  testId?: string;
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  text?: string;
}): void {
  const stableFields = [
    target.testId,
    target.role,
    target.name,
    target.label,
    target.placeholder,
    target.text,
  ].filter((value) => value !== undefined);

  if (stableFields.length === 0) {
    throw new ReplayGenerationError(
      "Unsupported trace: action target lacks stable locator fields.",
    );
  }
}

export function parseReplayFixture(input: unknown): ReplayFixture {
  const parsed = replayFixtureSchema.safeParse(input);
  if (!parsed.success) {
    throw new ReplayGenerationError(
      `Invalid replay fixture: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  for (const criterion of parsed.data.criteria) {
    assertReplayableActions(criterion.steps);
  }

  return parsed.data;
}

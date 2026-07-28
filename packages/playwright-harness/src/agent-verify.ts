import {
  assertionSchema,
  browserActionSchema,
  buildSkippedCriterionVerdict,
  finalizeExhaustedCriterion,
  shouldSkipCriterion,
  verdictSchema,
  type AssertionResult,
  type Criterion,
  type CriterionLoopLimits,
  type CriterionVerdict,
  type ProofConfig,
} from "@skeptic/core";
import type { EvidenceStore } from "@skeptic/evidence";
import { generateText, stepCountIs, tool, type LanguageModel } from "ai";
import { z } from "zod";

import type { HarnessEvidenceBridge } from "./evidence-bridge.ts";
import type { PlaywrightHarness } from "./harness.ts";
import {
  LoopLimitReachedError,
  VerificationLoopRunner,
} from "./verification-loop.ts";

export interface AgentCriterionOptions {
  model: LanguageModel;
  limits: CriterionLoopLimits;
  config: ProofConfig;
  auth: { username: string; password: string };
  runId: string;
  store: EvidenceStore;
}

export function buildAgentSystemPrompt(
  criterion: Criterion,
  options: AgentCriterionOptions,
): string {
  const loginPath = options.config.auth?.loginPath ?? "/login";
  return [
    "You are Skeptic's verification agent.",
    "Verify one acceptance criterion using only the provided tools.",
    "The deterministic oracle decides PASS/FAIL from typed assertions — not your confidence.",
    "",
    `Criterion ${criterion.index}: ${criterion.sourceText}`,
    `Base URL: ${options.config.app.baseUrl}`,
    `Login path: ${loginPath}`,
    `Test username: ${options.auth.username}`,
    `Test password: ${options.auth.password}`,
    "",
    "Rules:",
    "- Stay within allowed origins.",
    "- Use inspect before acting on unfamiliar UI.",
    "- Record evidence with captureEvidence before claiming PASS.",
    "- Call finish with proposedVerdict and explanation when done.",
    "- Do not invent selectors; derive targets from inspect results (testId, role, name).",
  ].join("\n");
}

function limitPayload(reason: "steps" | "duration" | "inference") {
  return {
    ok: false as const,
    limitReached: true as const,
    limitReason: reason,
  };
}

export async function executeAgentCriterion(
  harness: PlaywrightHarness,
  bridge: HarnessEvidenceBridge,
  criterion: Criterion,
  priorVerdicts: ReadonlyMap<number, CriterionVerdict>,
  options: AgentCriterionOptions,
): Promise<CriterionVerdict> {
  const prerequisiteFailure = shouldSkipCriterion(criterion, priorVerdicts);

  if (prerequisiteFailure) {
    const skipped = buildSkippedCriterionVerdict(
      criterion,
      prerequisiteFailure,
    );
    return bridge.recordCriterionResult({
      observations: [],
      assertionResults: skipped.assertionResults ?? [],
      verdict: skipped,
    });
  }

  const loop = new VerificationLoopRunner(harness, {
    criterionIndex: criterion.index,
    hypothesis: `Explore and verify: ${criterion.sourceText}`,
    limits: options.limits,
  });

  let completed: CriterionVerdict | null = null;
  let limitReason: "steps" | "duration" | "inference" | undefined;

  const recordAgentEvent = async (
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> => {
    await options.store.appendEvent({
      runId: options.runId,
      timestamp: Date.now(),
      actor: "agent",
      type,
      payload,
      criterionIndex: criterion.index,
    });
  };

  const wrapLoopCall = async <T>(
    fn: () => Promise<T>,
  ): Promise<T | ReturnType<typeof limitPayload>> => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof LoopLimitReachedError) {
        limitReason = error.reason;
        return limitPayload(error.reason);
      }
      throw error;
    }
  };

  const tools = {
    inspect: tool({
      description:
        "Inspect the current browser page and return structured elements.",
      inputSchema: z.object({}),
      execute: async () => {
        await recordAgentEvent("agent.inspect", {});
        const result = await wrapLoopCall(async () => {
          const observation = await loop.observe();
          await bridge.recordPageObservation(observation, criterion.index);
          return { ok: true, observation };
        });
        return result;
      },
    }),
    browserAction: tool({
      description:
        "Execute one typed browser action against the authorized origin.",
      inputSchema: browserActionSchema,
      execute: async (action) => {
        await recordAgentEvent("agent.action", {
          actionId: action.actionId,
          type: action.type,
        });
        const result = await wrapLoopCall(async () => {
          const executed = await loop.act(action);
          if (executed.assertionResult) {
            await bridge.recordAssertionResult(
              executed.assertionResult,
              criterion.index,
            );
          }
          return executed;
        });
        return result;
      },
    }),
    assertion: tool({
      description: "Run one deterministic assertion against the current page.",
      inputSchema: z.object({
        actionId: z.string().min(1),
        assertion: assertionSchema,
      }),
      execute: async ({ actionId, assertion }) => {
        await recordAgentEvent("agent.assertion", {
          actionId,
          assertionType: assertion.type,
        });
        const result = await wrapLoopCall(async () => {
          const executed = await loop.act({
            actionId,
            type: "assert",
            assertion,
          });
          if (executed.assertionResult) {
            await bridge.recordAssertionResult(
              executed.assertionResult,
              criterion.index,
            );
          }
          return executed;
        });
        return result;
      },
    }),
    captureEvidence: tool({
      description:
        "Capture a screenshot artifact for the active criterion before finishing with PASS.",
      inputSchema: z.object({
        label: z.string().min(1),
      }),
      execute: async ({ label }) => {
        await recordAgentEvent("agent.evidence", { label });
        const currentUrl = harness.page.url();
        const result = await wrapLoopCall(async () => {
          const executed = await loop.act({
            actionId: `evidence-${Date.now()}`,
            type: "assert",
            assertion: { type: "url", expected: currentUrl },
          });
          if (executed.assertionResult) {
            await bridge.recordAssertionResult(
              executed.assertionResult,
              criterion.index,
            );
          }
          for (const ref of executed.assertionResult?.artifactRefs ?? []) {
            loop.addArtifactRef(ref);
          }
          return {
            ok: executed.ok,
            label,
            artifactRefs: executed.assertionResult?.artifactRefs ?? [],
          };
        });
        return result;
      },
    }),
    finish: tool({
      description:
        "Submit the active criterion to the deterministic oracle and end agent work.",
      inputSchema: z.object({
        proposedVerdict: verdictSchema.optional(),
        explanation: z.string().min(1),
      }),
      execute: async ({ proposedVerdict, explanation }) => {
        const finalized = loop.finalize(criterion.sourceText, proposedVerdict);
        completed = await bridge.recordCriterionResult({
          observations: finalized.observations,
          assertionResults: finalized.assertionResults,
          verdict: {
            ...finalized.verdict,
            explanation: `${explanation} Oracle: ${finalized.verdict.explanation}`,
          },
        });
        await recordAgentEvent("agent.finish", {
          verdict: completed.verdict,
          explanation: completed.explanation,
        });
        return {
          ok: true,
          verdict: completed.verdict,
          explanation: completed.explanation,
        };
      },
    }),
  };

  try {
    await generateText({
      model: options.model,
      system: buildAgentSystemPrompt(criterion, options),
      prompt: `Verify criterion ${criterion.index}. Navigate to ${options.config.app.baseUrl}, authenticate if needed, then gather deterministic evidence.`,
      tools,
      stopWhen: stepCountIs(options.limits.maxInferenceAttempts),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const harnessVerdict: CriterionVerdict = {
      criterionIndex: criterion.index,
      sourceText: criterion.sourceText,
      verdict: "HARNESS_ERROR",
      explanation: `Agent verification failed: ${message}`,
      assertionResults: loop.state.stepCount > 0 ? [] : [],
      artifactRefs: bridge.collectArtifactRefs(),
    };
    return bridge.recordCriterionResult({
      observations: [],
      assertionResults: harnessVerdict.assertionResults ?? [],
      verdict: harnessVerdict,
    });
  }

  if (completed) {
    return completed;
  }

  const exhausted = loop.finalize(criterion.sourceText);
  const reason = limitReason ?? "inference";
  const verdict = finalizeExhaustedCriterion(
    {
      criterionIndex: criterion.index,
      sourceText: criterion.sourceText,
      assertionResults: exhausted.assertionResults as AssertionResult[],
      artifactRefs: exhausted.artifactRefs,
    },
    reason,
  );

  return bridge.recordCriterionResult({
    observations: exhausted.observations,
    assertionResults: exhausted.assertionResults,
    verdict,
  });
}

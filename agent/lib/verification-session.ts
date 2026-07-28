import { defineState } from "eve/context";
import { resolve } from "node:path";
import {
  checkLoopLimits,
  createCriterionLoopState,
  DEFAULT_CRITERION_LOOP_LIMITS,
  loadProofConfig,
  resolveLoopLimits,
  type AssertionResult,
  type CriterionLoopLimits,
  type CriterionLoopState,
  type ProofConfig,
} from "@skeptic/core";
import { PlaywrightHarness } from "@skeptic/playwright-harness";

import type { ResolvedSkepticModel } from "@skeptic/core";

import {
  ProviderSetupError,
  resolveProviderOrThrow,
} from "./provider-setup.ts";

export interface ActiveCriterionState {
  loop: CriterionLoopState;
  assertionResults: AssertionResult[];
  artifactRefs: string[];
  recommendedVerdict?: string;
}

export interface VerificationSessionState {
  harness: PlaywrightHarness | null;
  allowedOrigins: string[];
  baseUrl: string;
  provider: ResolvedSkepticModel | null;
  inferenceCount: number;
  repairAttempts: number;
  harnessError: string | null;
  launched: boolean;
  activeCriterion: ActiveCriterionState | null;
  config: ProofConfig | null;
  loopLimits: CriterionLoopLimits;
}

function resolveConfigPath(): string {
  const configured = globalThis.process.env.PROOF_CONFIG;
  if (configured && configured.length > 0) {
    return resolve(globalThis.process.cwd(), configured);
  }

  return resolve(globalThis.process.cwd(), "proof.config.ts");
}

function initialState(): VerificationSessionState {
  let provider: ResolvedSkepticModel | null = null;
  try {
    provider = resolveProviderOrThrow();
  } catch (error) {
    throw new ProviderSetupError(
      error instanceof Error ? error.message : "Provider setup failed.",
    );
  }

  const baseUrl =
    globalThis.process.env.PROOF_BASE_URL ?? "http://127.0.0.1:3000";

  return {
    harness: null,
    allowedOrigins: [baseUrl],
    baseUrl,
    provider,
    inferenceCount: 0,
    repairAttempts: 0,
    harnessError: null,
    launched: false,
    activeCriterion: null,
    config: null,
    loopLimits: DEFAULT_CRITERION_LOOP_LIMITS,
  };
}

export const verificationSession = defineState(
  "skeptic.verification",
  initialState,
);

let configLoadPromise: Promise<ProofConfig | null> | null = null;

export async function ensureSessionConfigLoaded(): Promise<ProofConfig | null> {
  const current = verificationSession.get();
  if (current.config) {
    return current.config;
  }

  if (!configLoadPromise) {
    configLoadPromise = (async () => {
      try {
        const config = await loadProofConfig(resolveConfigPath());
        verificationSession.update((state) => ({
          ...state,
          config,
          baseUrl: config.app.baseUrl,
          allowedOrigins: [...config.app.allowedOrigins],
          loopLimits: resolveLoopLimits(config),
        }));
        return config;
      } catch {
        return null;
      }
    })();
  }

  return configLoadPromise;
}

export function getSessionLoopLimits(): CriterionLoopLimits {
  return verificationSession.get().loopLimits;
}

export function beginCriterionVerification(input: {
  criterionIndex: number;
  hypothesis: string;
}): CriterionLoopState {
  const loop = createCriterionLoopState(input);
  verificationSession.update((current) => ({
    ...current,
    activeCriterion: {
      loop,
      assertionResults: [],
      artifactRefs: [],
    },
    repairAttempts: 0,
    inferenceCount: 0,
  }));
  return loop;
}

export function getActiveCriterionState(): ActiveCriterionState | null {
  return verificationSession.get().activeCriterion;
}

export function recordInferenceAttempt():
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "inference";
    } {
  const state = verificationSession.get();
  const nextInference = state.inferenceCount + 1;

  if (!state.activeCriterion) {
    verificationSession.update((current) => ({
      ...current,
      inferenceCount: nextInference,
    }));
    return { ok: true };
  }

  const nextLoop = {
    ...state.activeCriterion.loop,
    inferenceCount: nextInference,
  };
  const limitStatus = checkLoopLimits(nextLoop, getSessionLoopLimits());

  verificationSession.update((current) => ({
    ...current,
    inferenceCount: nextInference,
    activeCriterion: current.activeCriterion
      ? {
          ...current.activeCriterion,
          loop: nextLoop,
        }
      : null,
  }));

  if (limitStatus.exhausted && limitStatus.reason === "inference") {
    return { ok: false, reason: "inference" };
  }

  return { ok: true };
}

export function recordVerificationStep():
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "steps" | "duration" | "inference";
    } {
  const state = verificationSession.get();
  if (!state.activeCriterion) {
    return { ok: true };
  }

  const nextLoop = {
    ...state.activeCriterion.loop,
    stepCount: state.activeCriterion.loop.stepCount + 1,
    inferenceCount: state.inferenceCount,
  };
  const limitStatus = checkLoopLimits(nextLoop, getSessionLoopLimits());

  verificationSession.update((current) => ({
    ...current,
    activeCriterion: current.activeCriterion
      ? {
          ...current.activeCriterion,
          loop: nextLoop,
        }
      : null,
  }));

  if (limitStatus.exhausted) {
    return {
      ok: false,
      reason: limitStatus.reason ?? "steps",
    };
  }

  return { ok: true };
}

export function recordAssertionResult(result: AssertionResult): void {
  verificationSession.update((current) => {
    if (!current.activeCriterion) {
      return current;
    }

    return {
      ...current,
      activeCriterion: {
        ...current.activeCriterion,
        assertionResults: [...current.activeCriterion.assertionResults, result],
      },
    };
  });
}

export function recordArtifactRef(ref: string): void {
  verificationSession.update((current) => {
    if (!current.activeCriterion || ref.trim().length === 0) {
      return current;
    }

    return {
      ...current,
      activeCriterion: {
        ...current.activeCriterion,
        artifactRefs: [...current.activeCriterion.artifactRefs, ref],
      },
    };
  });
}

export function recordRecommendedVerdict(verdict: string): void {
  verificationSession.update((current) => {
    if (!current.activeCriterion) {
      return current;
    }

    return {
      ...current,
      activeCriterion: {
        ...current.activeCriterion,
        recommendedVerdict: verdict,
      },
    };
  });
}

export function clearActiveCriterion(): void {
  verificationSession.update((current) => ({
    ...current,
    activeCriterion: null,
    repairAttempts: 0,
    inferenceCount: 0,
  }));
}

export async function ensureHarnessLaunched(): Promise<PlaywrightHarness> {
  await ensureSessionConfigLoaded();
  const state = verificationSession.get();

  if (state.harnessError) {
    throw new Error(state.harnessError);
  }

  if (!state.provider) {
    const message = "Model provider is not configured.";
    verificationSession.update((current) => ({
      ...current,
      harnessError: message,
    }));
    throw new Error(message);
  }

  if (state.launched && state.harness) {
    return state.harness;
  }

  const harness = new PlaywrightHarness({
    allowedOrigins: state.allowedOrigins,
    headless: true,
  });

  try {
    await harness.launch();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to launch Playwright harness.";
    verificationSession.update((current) => ({
      ...current,
      harnessError: message,
    }));
    throw new Error(message);
  }

  verificationSession.update((current) => ({
    ...current,
    harness,
    launched: true,
  }));

  return harness;
}

export async function closeHarnessIfOpen(): Promise<void> {
  const state = verificationSession.get();
  if (state.harness) {
    await state.harness.close();
    verificationSession.update((current) => ({
      ...current,
      harness: null,
      launched: false,
      activeCriterion: null,
    }));
  }
}

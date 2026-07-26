import { defineState } from "eve/context";
import { PlaywrightHarness } from "@skeptic/playwright-harness";

import type { ResolvedSkepticModel } from "@skeptic/core";

import {
  ProviderSetupError,
  resolveProviderOrThrow,
} from "./provider-setup.ts";

export interface VerificationSessionState {
  harness: PlaywrightHarness | null;
  allowedOrigins: string[];
  baseUrl: string;
  provider: ResolvedSkepticModel | null;
  inferenceCount: number;
  repairAttempts: number;
  harnessError: string | null;
  launched: boolean;
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
    globalThis.process.env.PROOF_BASE_URL ?? "http://127.0.0.1:3100";

  return {
    harness: null,
    allowedOrigins: [baseUrl],
    baseUrl,
    provider,
    inferenceCount: 0,
    repairAttempts: 0,
    harnessError: null,
    launched: false,
  };
}

export const verificationSession = defineState(
  "skeptic.verification",
  initialState,
);

export async function ensureHarnessLaunched(): Promise<PlaywrightHarness> {
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
    }));
  }
}

import { resolveSkepticModel, type ResolvedSkepticModel } from "@skeptic/core";

export class ProviderSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderSetupError";
  }
}

export function resolveProviderOrThrow(
  env: NodeJS.ProcessEnv = globalThis.process.env,
): ResolvedSkepticModel {
  try {
    return resolveSkepticModel(env);
  } catch (error) {
    throw new ProviderSetupError(
      error instanceof Error
        ? error.message
        : "Skeptic model provider is misconfigured.",
    );
  }
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxAttempts) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * attempt),
      );
    }
  }

  throw lastError ?? new Error("Transient operation failed.");
}

export function formatProviderLog(provider: ResolvedSkepticModel): {
  provider: string;
  modelId: string;
  credentialSource: string;
} {
  return {
    provider: provider.provider,
    modelId: provider.modelId,
    credentialSource: provider.credentialSource,
  };
}

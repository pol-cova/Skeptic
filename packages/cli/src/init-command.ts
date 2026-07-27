import {
  resolveSkepticModel,
  skepticProviderIds,
  type SkepticProviderId,
} from "@skeptic/core";

export interface InitCommandOptions {
  provider?: SkepticProviderId;
}

export interface InitCommandResult {
  provider: SkepticProviderId;
  modelId: string;
  credentialSource: string;
  setup: string;
  validated: boolean;
}

const providerSetupGuide: Record<
  SkepticProviderId,
  { setup: string; credentialSource: string }
> = {
  chatgpt: {
    credentialSource: "codex login",
    setup:
      "Run `codex login` to reuse your local ChatGPT subscription. No AWS account is required.",
  },
  openrouter: {
    credentialSource: "OPENROUTER_API_KEY",
    setup: "Export OPENROUTER_API_KEY before agent verification.",
  },
  cerebras: {
    credentialSource: "CEREBRAS_API_KEY",
    setup: "Export CEREBRAS_API_KEY before agent verification.",
  },
  bedrock: {
    credentialSource:
      "AWS_BEARER_TOKEN_BEDROCK or the standard AWS credential chain",
    setup:
      "Configure AWS credentials and AWS_REGION for official Bedrock demo runs.",
  },
  "google-ai": {
    credentialSource: "GOOGLE_GENERATIVE_AI_API_KEY",
    setup: "Export GOOGLE_GENERATIVE_AI_API_KEY before agent verification.",
  },
  "openai-compatible": {
    credentialSource: "SKEPTIC_API_KEY or SKEPTIC_API_KEY_ENV",
    setup:
      "Set SKEPTIC_BASE_URL, SKEPTIC_MODEL, and the API key environment variable named by SKEPTIC_API_KEY_ENV (default SKEPTIC_API_KEY).",
  },
};

function buildEnvForProvider(
  provider: SkepticProviderId,
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return {
    ...env,
    SKEPTIC_PROVIDER: provider,
  };
}

export function listInitProviders(): Array<{
  id: SkepticProviderId;
  credentialSource: string;
  setup: string;
}> {
  return skepticProviderIds.map((provider) => ({
    id: provider,
    credentialSource: providerSetupGuide[provider].credentialSource,
    setup: providerSetupGuide[provider].setup,
  }));
}

export function runInitCommand(
  options: InitCommandOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): InitCommandResult {
  const provider = options.provider ?? "chatgpt";

  if (!skepticProviderIds.includes(provider)) {
    throw new Error(
      `Unsupported provider "${provider}". Expected ${skepticProviderIds.join(", ")}.`,
    );
  }

  const guide = providerSetupGuide[provider];
  let validated = true;
  let modelId = "";

  try {
    const resolved = resolveSkepticModel(buildEnvForProvider(provider, env));
    modelId = resolved.modelId;
    validated = true;
  } catch {
    validated = provider === "chatgpt";
    modelId =
      env.SKEPTIC_MODEL ??
      (provider === "chatgpt"
        ? "gpt-5.6-sol"
        : provider === "openrouter"
          ? "openai/gpt-5.4-mini"
          : provider === "cerebras"
            ? "gpt-oss-120b"
            : provider === "bedrock"
              ? "amazon.nova-lite-v1:0"
              : provider === "google-ai"
                ? "gemini-2.0-flash-exp"
                : "unset");
  }

  return {
    provider,
    modelId,
    credentialSource: guide.credentialSource,
    setup: guide.setup,
    validated,
  };
}

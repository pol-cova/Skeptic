import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createCerebras } from "@ai-sdk/cerebras";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { experimental_chatgpt } from "eve/models/openai";

export const skepticProviderIds = [
  "chatgpt",
  "openrouter",
  "cerebras",
  "bedrock",
  "openai-compatible",
] as const;

export type SkepticProviderId = (typeof skepticProviderIds)[number];

export interface ResolvedSkepticModel {
  provider: SkepticProviderId;
  modelId: string;
  credentialSource: string;
  model: LanguageModel;
}

const defaultModels: Record<
  Exclude<SkepticProviderId, "openai-compatible">,
  string
> = {
  chatgpt: "gpt-5.6-sol",
  openrouter: "openai/gpt-5.4-mini",
  cerebras: "gpt-oss-120b",
  bedrock: "amazon.nova-lite-v1:0",
};

function readProvider(env: NodeJS.ProcessEnv): SkepticProviderId {
  const value = env.SKEPTIC_PROVIDER ?? "chatgpt";
  if (skepticProviderIds.includes(value as SkepticProviderId)) {
    return value as SkepticProviderId;
  }

  throw new Error(
    `Unsupported SKEPTIC_PROVIDER "${value}". Expected ${skepticProviderIds.join(", ")}.`,
  );
}

function requireEnvironmentValue(
  env: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} for the selected Skeptic provider.`);
  }
  return value;
}

function readCompatibleBaseUrl(env: NodeJS.ProcessEnv): string {
  const raw = requireEnvironmentValue(env, "SKEPTIC_BASE_URL");
  const url = new URL(raw);
  const isLoopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error(
      "SKEPTIC_BASE_URL must use HTTPS, except for localhost development.",
    );
  }
  if (url.username || url.password) {
    throw new Error("SKEPTIC_BASE_URL must not contain credentials.");
  }
  return url.toString().replace(/\/$/, "");
}

function readCompatibleApiKey(
  env: NodeJS.ProcessEnv,
): { apiKey: string; source: string } {
  const source = env.SKEPTIC_API_KEY_ENV?.trim() || "SKEPTIC_API_KEY";
  if (!/^[A-Z][A-Z0-9_]*$/.test(source)) {
    throw new Error(
      "SKEPTIC_API_KEY_ENV must name an uppercase environment variable.",
    );
  }
  return {
    apiKey: requireEnvironmentValue(env, source),
    source,
  };
}

export function resolveSkepticModel(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedSkepticModel {
  const provider = readProvider(env);

  if (provider === "chatgpt") {
    const modelId = env.SKEPTIC_MODEL ?? defaultModels.chatgpt;
    return {
      provider,
      modelId,
      credentialSource: "codex login",
      model: experimental_chatgpt(modelId),
    };
  }

  if (provider === "openrouter") {
    const modelId = env.SKEPTIC_MODEL ?? defaultModels.openrouter;
    return {
      provider,
      modelId,
      credentialSource: "OPENROUTER_API_KEY",
      model: createOpenRouter({
        apiKey: requireEnvironmentValue(env, "OPENROUTER_API_KEY"),
      }).chat(modelId),
    };
  }

  if (provider === "cerebras") {
    const modelId = env.SKEPTIC_MODEL ?? defaultModels.cerebras;
    return {
      provider,
      modelId,
      credentialSource: "CEREBRAS_API_KEY",
      model: createCerebras({
        apiKey: requireEnvironmentValue(env, "CEREBRAS_API_KEY"),
      })(modelId),
    };
  }

  if (provider === "bedrock") {
    const modelId = env.SKEPTIC_MODEL ?? defaultModels.bedrock;
    const region = env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "us-east-1";
    return {
      provider,
      modelId,
      credentialSource:
        "AWS_BEARER_TOKEN_BEDROCK or the standard AWS credential chain",
      model: createAmazonBedrock({ region })(modelId),
    };
  }

  const modelId = requireEnvironmentValue(env, "SKEPTIC_MODEL");
  const baseURL = readCompatibleBaseUrl(env);
  const { apiKey, source } = readCompatibleApiKey(env);
  return {
    provider,
    modelId,
    credentialSource: source,
    model: createOpenAICompatible({
      name: "skeptic-byoc",
      apiKey,
      baseURL,
      includeUsage: true,
    })(modelId),
  };
}

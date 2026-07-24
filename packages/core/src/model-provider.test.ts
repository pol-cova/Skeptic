import { describe, expect, it } from "vitest";

import { resolveSkepticModel, skepticProviderIds } from "./model-provider.ts";

describe("model-provider", () => {
  it("defaults to the local ChatGPT subscription", () => {
    const resolved = resolveSkepticModel({});

    expect(resolved.provider).toBe("chatgpt");
    expect(resolved.modelId).toBe("gpt-5.6-sol");
    expect(resolved.credentialSource).toBe("codex login");
  });

  it("lists every supported native and BYOC provider", () => {
    expect(skepticProviderIds).toEqual([
      "chatgpt",
      "openrouter",
      "cerebras",
      "bedrock",
      "openai-compatible",
    ]);
  });

  it("fails clearly when a BYOC credential is missing", () => {
    expect(() =>
      resolveSkepticModel({ SKEPTIC_PROVIDER: "openrouter" }),
    ).toThrow(/Missing OPENROUTER_API_KEY/);
    expect(() => resolveSkepticModel({ SKEPTIC_PROVIDER: "cerebras" })).toThrow(
      /Missing CEREBRAS_API_KEY/,
    );
  });

  it("accepts an explicit OpenAI-compatible endpoint", () => {
    const resolved = resolveSkepticModel({
      SKEPTIC_PROVIDER: "openai-compatible",
      SKEPTIC_MODEL: "example-model",
      SKEPTIC_BASE_URL: "https://models.example.test/v1",
      SKEPTIC_API_KEY_ENV: "EXAMPLE_API_KEY",
      EXAMPLE_API_KEY: "secret",
    });

    expect(resolved.provider).toBe("openai-compatible");
    expect(resolved.modelId).toBe("example-model");
    expect(resolved.credentialSource).toBe("EXAMPLE_API_KEY");
  });

  it("rejects insecure remote compatible endpoints", () => {
    expect(() =>
      resolveSkepticModel({
        SKEPTIC_PROVIDER: "openai-compatible",
        SKEPTIC_MODEL: "example-model",
        SKEPTIC_BASE_URL: "http://models.example.test/v1",
        SKEPTIC_API_KEY: "secret",
      }),
    ).toThrow(/must use HTTPS/);
  });
});

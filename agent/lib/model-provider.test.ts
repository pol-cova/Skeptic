import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSkepticModel,
  skepticProviderIds,
} from "./model-provider.ts";

test("defaults to the local ChatGPT subscription", () => {
  const resolved = resolveSkepticModel({});

  assert.equal(resolved.provider, "chatgpt");
  assert.equal(resolved.modelId, "gpt-5.6-sol");
  assert.equal(resolved.credentialSource, "codex login");
});

test("lists every supported native and BYOC provider", () => {
  assert.deepEqual(skepticProviderIds, [
    "chatgpt",
    "openrouter",
    "cerebras",
    "bedrock",
    "openai-compatible",
  ]);
});

test("fails clearly when a BYOC credential is missing", () => {
  assert.throws(
    () => resolveSkepticModel({ SKEPTIC_PROVIDER: "openrouter" }),
    /Missing OPENROUTER_API_KEY/,
  );
  assert.throws(
    () => resolveSkepticModel({ SKEPTIC_PROVIDER: "cerebras" }),
    /Missing CEREBRAS_API_KEY/,
  );
});

test("accepts an explicit OpenAI-compatible endpoint", () => {
  const resolved = resolveSkepticModel({
    SKEPTIC_PROVIDER: "openai-compatible",
    SKEPTIC_MODEL: "example-model",
    SKEPTIC_BASE_URL: "https://models.example.test/v1",
    SKEPTIC_API_KEY_ENV: "EXAMPLE_API_KEY",
    EXAMPLE_API_KEY: "secret",
  });

  assert.equal(resolved.provider, "openai-compatible");
  assert.equal(resolved.modelId, "example-model");
  assert.equal(resolved.credentialSource, "EXAMPLE_API_KEY");
});

test("rejects insecure remote compatible endpoints", () => {
  assert.throws(
    () =>
      resolveSkepticModel({
        SKEPTIC_PROVIDER: "openai-compatible",
        SKEPTIC_MODEL: "example-model",
        SKEPTIC_BASE_URL: "http://models.example.test/v1",
        SKEPTIC_API_KEY: "secret",
      }),
    /must use HTTPS/,
  );
});

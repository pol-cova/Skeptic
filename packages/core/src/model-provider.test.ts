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
      "google-ai",
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

  describe("google-ai provider", () => {
    it("resolves with valid API key and uses default model", () => {
      const resolved = resolveSkepticModel({
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: "test-api-key-123",
      });

      expect(resolved.provider).toBe("google-ai");
      expect(resolved.modelId).toBe("gemini-2.0-flash-exp");
      expect(resolved.credentialSource).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
      expect(resolved.model).toBeDefined();
    });

    it("throws error when API key is missing", () => {
      expect(() =>
        resolveSkepticModel({
          SKEPTIC_PROVIDER: "google-ai",
        }),
      ).toThrow(/Missing GOOGLE_GENERATIVE_AI_API_KEY/);
    });

    it("uses explicit SKEPTIC_MODEL when provided", () => {
      const resolved = resolveSkepticModel({
        SKEPTIC_PROVIDER: "google-ai",
        SKEPTIC_MODEL: "gemini-1.5-flash",
        GOOGLE_GENERATIVE_AI_API_KEY: "test-api-key-123",
      });

      expect(resolved.provider).toBe("google-ai");
      expect(resolved.modelId).toBe("gemini-1.5-flash");
      expect(resolved.credentialSource).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
      expect(resolved.model).toBeDefined();
    });

    it("throws error when API key is empty string", () => {
      expect(() =>
        resolveSkepticModel({
          SKEPTIC_PROVIDER: "google-ai",
          GOOGLE_GENERATIVE_AI_API_KEY: "   ",
        }),
      ).toThrow(/Missing GOOGLE_GENERATIVE_AI_API_KEY/);
    });

    describe("error scenarios", () => {
      it("produces clear error message for missing API key (Requirement 3.1, 3.2)", () => {
        expect(() =>
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "google-ai",
          }),
        ).toThrow(
          "Missing GOOGLE_GENERATIVE_AI_API_KEY for the selected Skeptic provider.",
        );
      });

      it("produces clear error message for whitespace-only API key (Requirement 3.1, 3.2)", () => {
        expect(() =>
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "google-ai",
            GOOGLE_GENERATIVE_AI_API_KEY: "\t  \n",
          }),
        ).toThrow(
          "Missing GOOGLE_GENERATIVE_AI_API_KEY for the selected Skeptic provider.",
        );
      });

      it("rejects invalid provider ID with helpful message listing all valid providers (Requirement 1.3)", () => {
        expect(() =>
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "google",
          }),
        ).toThrow(
          'Unsupported SKEPTIC_PROVIDER "google". Expected chatgpt, openrouter, cerebras, bedrock, openai-compatible, google-ai.',
        );
      });

      it("rejects typo in provider ID with guidance (Requirement 1.3)", () => {
        expect(() =>
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "googleai",
          }),
        ).toThrow(
          'Unsupported SKEPTIC_PROVIDER "googleai". Expected chatgpt, openrouter, cerebras, bedrock, openai-compatible, google-ai.',
        );
      });

      it("validates provider ID case-sensitivity (Requirement 1.3)", () => {
        expect(() =>
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "Google-AI",
          }),
        ).toThrow(
          'Unsupported SKEPTIC_PROVIDER "Google-AI". Expected chatgpt, openrouter, cerebras, bedrock, openai-compatible, google-ai.',
        );
      });

      it("handles invalid configuration gracefully with empty env object", () => {
        // Should use default provider (chatgpt), not throw for google-ai
        const resolved = resolveSkepticModel({});
        expect(resolved.provider).toBe("chatgpt");
      });

      it("error messages guide users to resolution by mentioning required credential", () => {
        try {
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "google-ai",
          });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const message = (error as Error).message;
          // Error message should mention the specific credential needed
          expect(message).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
          // Error message should indicate what's wrong
          expect(message).toContain("Missing");
        }
      });

      it("verifies error message format guides to resolution path", () => {
        try {
          resolveSkepticModel({
            SKEPTIC_PROVIDER: "google-ai",
            GOOGLE_GENERATIVE_AI_API_KEY: "",
          });
          expect.fail("Should have thrown an error");
        } catch (error) {
          const message = (error as Error).message;
          // Message should be actionable
          expect(message).toMatch(
            /Missing.*GOOGLE_GENERATIVE_AI_API_KEY.*provider/,
          );
        }
      });
    });
  });
});

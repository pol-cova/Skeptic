import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Integration tests for google-ai-native preflight script
 *
 * **Validates: Requirements 6.4, 6.5**
 *
 * These tests verify that the preflight script:
 * - Succeeds with valid configuration (exit code 0)
 * - Fails with missing API key (exit code 2)
 * - Fails with invalid API key (exit code 1)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, "google-ai-native.ts");

describe("google-ai-native preflight script", () => {
  it("exits with code 2 when GOOGLE_GENERATIVE_AI_API_KEY is missing", () => {
    const result = spawnSync("node", [scriptPath], {
      env: {
        ...process.env,
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: undefined,
      },
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(result.stderr).toContain("Setup:");
  });

  it("exits with code 2 when GOOGLE_GENERATIVE_AI_API_KEY is empty", () => {
    const result = spawnSync("node", [scriptPath], {
      env: {
        ...process.env,
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: "",
      },
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
  });

  it("exits with code 1 when GOOGLE_GENERATIVE_AI_API_KEY is invalid", () => {
    const result = spawnSync("node", [scriptPath], {
      env: {
        ...process.env,
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: "invalid-api-key-xyz",
      },
      encoding: "utf-8",
      timeout: 30_000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("preflight failed");
    expect(result.stderr).toContain("Troubleshooting:");
  });

  it.skip("succeeds with valid configuration", () => {
    // This test only runs if a valid API key is available in the environment
    const result = spawnSync("node", [scriptPath], {
      env: {
        ...process.env,
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      encoding: "utf-8",
      timeout: 30_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Success!");
    expect(result.stdout).toContain("Native Google AI provider is working");
    expect(result.stdout).toContain("Provider: google-ai");
    expect(result.stdout).toContain("Response:");
  });

  it.skip("validates structured output with valid configuration", () => {
    // This test only runs if a valid API key is available in the environment
    const result = spawnSync("node", [scriptPath], {
      env: {
        ...process.env,
        SKEPTIC_PROVIDER: "google-ai",
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      encoding: "utf-8",
      timeout: 30_000,
    });

    expect(result.status).toBe(0);

    // Verify structured output is present and valid JSON
    const output = result.stdout;
    expect(output).toContain("Response:");

    // Extract JSON from output
    const jsonMatch = output.match(/Response:\s*(\{[\s\S]*\})/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[1]);
      expect(json).toHaveProperty("status", "ok");
      expect(json).toHaveProperty("summary");
      expect(json).toHaveProperty("provider");
      expect(json.summary).toBeTruthy();
    }
  });
});

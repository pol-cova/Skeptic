import { describe, expect, it } from "vitest";

import { buildAgentSystemPrompt } from "./agent-verify.ts";

describe("buildAgentSystemPrompt", () => {
  it("includes criterion text and auth context", () => {
    const prompt = buildAgentSystemPrompt(
      {
        index: 2,
        sourceText: "Inviting the same email twice shows a duplicate error.",
        prerequisites: [],
      },
      {
        model: {} as never,
        limits: {
          maxSteps: 20,
          maxDurationMs: 180_000,
          maxInferenceAttempts: 10,
        },
        config: {
          app: {
            baseUrl: "http://127.0.0.1:3100",
            startCommand: "npm run dev",
            readyPath: "/health",
            allowedOrigins: ["http://127.0.0.1:3100"],
          },
          criteria: { file: "acceptance.md", maxCriteria: 5 },
          auth: {
            loginPath: "/login",
            usernameEnv: "PROOF_TEST_USERNAME",
            passwordEnv: "PROOF_TEST_PASSWORD",
          },
          scenario: { module: "./scenario.ts" },
          prerequisites: {},
          limits: {
            maxSteps: 20,
            maxDurationMs: 180_000,
            maxInferenceAttempts: 10,
          },
        },
        auth: { username: "demo", password: "secret" },
        runId: "verify-test",
        store: {} as never,
      },
    );

    expect(prompt).toContain("Criterion 2");
    expect(prompt).toContain("duplicate error");
    expect(prompt).toContain("http://127.0.0.1:3100");
    expect(prompt).toContain("demo");
    expect(prompt).toContain("deterministic oracle");
  });
});

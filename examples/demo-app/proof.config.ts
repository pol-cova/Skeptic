import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3100"],
  },
  criteria: {
    file: "acceptance.md",
    maxCriteria: 3,
  },
  auth: {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  },
  scenario: {
    module: "./scenario.ts",
  },
  prerequisites: {
    "3": [2],
  },
  limits: {
    maxSteps: 25,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
});

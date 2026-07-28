import { defineProofConfig } from "@skeptic/core";

/**
 * Minimal proof.config.ts for any web app Skeptic should verify.
 *
 * 1. Point `criteria.file` at numbered Markdown acceptance criteria.
 * 2. Implement `scenario.ts` exporting `buildScenario(context)` — a ReplayFixture
 *    with typed browser steps (see docs/scenarios.md).
 * 3. Set auth env vars and run: skeptic verify --config proof.config.ts --deterministic
 */
export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3000",
    startCommand: "npm run dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3000"],
  },
  criteria: {
    file: "acceptance.md",
    maxCriteria: 5,
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
    // "3": [2] — criterion 3 requires criterion 2 to PASS first
  },
  limits: {
    maxSteps: 25,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
});

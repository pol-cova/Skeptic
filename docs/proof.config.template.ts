import type { ProofConfig } from "./config.schema.ts";

/**
 * Minimal proof.config.ts for any web app Skeptic should verify.
 *
 * 1. Point `criteria.file` at numbered Markdown acceptance criteria.
 * 2. Implement `scenario.ts` exporting `buildScenario(context)` — a ReplayFixture
 *    with typed browser steps (see docs/scenarios.md).
 * 3. Run `skeptic validate`, set auth env vars, then `skeptic verify --deterministic`.
 *
 * For npm users without the monorepo, export a plain object (see `skeptic init` scaffold)
 * or install workspace packages.
 */
export default {
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
  prerequisites: {},
  limits: {
    maxSteps: 20,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
} satisfies ProofConfig;

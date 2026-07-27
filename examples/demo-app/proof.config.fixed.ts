import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3101",
    startCommand: "pnpm --filter demo-app exec next dev --port 3101",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3101"],
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
});

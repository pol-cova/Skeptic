import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3100"],
  },
  criteria: {
    file: "examples/demo-app/acceptance.md",
    maxCriteria: 3,
  },
});

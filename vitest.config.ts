import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/core/vitest.config.ts",
      "packages/cli/vitest.config.ts",
      "packages/playwright-harness/vitest.config.ts",
      "packages/report/vitest.config.ts",
      "agent/vitest.config.ts",
    ],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["package-contents.test.ts"],
  },
});

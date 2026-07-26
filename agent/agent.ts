import { defineAgent } from "eve";

import {
  formatProviderLog,
  resolveProviderOrThrow,
} from "./lib/provider-setup.ts";

const resolvedProvider = resolveProviderOrThrow();

console.info("[Skeptic] Provider ready", formatProviderLog(resolvedProvider));

export default defineAgent({
  model: resolvedProvider.model,
  modelContextWindowTokens: 120_000,
  limits: {
    maxInputTokensPerSession: 100_000,
    maxOutputTokensPerSession: 12_000,
  },
  build: {
    externalDependencies: ["playwright", "@skeptic/playwright-harness"],
  },
});

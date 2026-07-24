import { defineAgent } from "eve";

import { resolveSkepticModel } from "./lib/model-provider.ts";

const resolvedModel = resolveSkepticModel();

export default defineAgent({
  model: resolvedModel.model,
  modelContextWindowTokens: 120_000,
  limits: {
    maxInputTokensPerSession: 100_000,
    maxOutputTokensPerSession: 12_000,
  },
});

import { defineAgent } from "eve";

import { resolveSkepticModel } from "@skeptic/core";

const resolvedModel = resolveSkepticModel();

export default defineAgent({
  model: resolvedModel.model,
  modelContextWindowTokens: 120_000,
  limits: {
    maxInputTokensPerSession: 100_000,
    maxOutputTokensPerSession: 12_000,
  },
});

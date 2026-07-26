import { assertionSchema } from "@skeptic/core";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ensureHarnessLaunched } from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Run one deterministic assertion against the current browser page.",
  inputSchema: z.object({
    actionId: z.string().min(1),
    assertion: assertionSchema,
  }),
  async execute({ actionId, assertion }) {
    const harness = await ensureHarnessLaunched();
    const result = await harness.execute({
      actionId,
      type: "assert",
      assertion,
    });

    return {
      ok: result.ok,
      error: result.error,
      assertionResult: result.assertionResult,
      observation: result.observation,
    };
  },
});

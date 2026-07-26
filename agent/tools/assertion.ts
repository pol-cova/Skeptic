import { assertionSchema } from "@skeptic/core";
import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  ensureHarnessLaunched,
  recordAssertionResult,
  recordVerificationStep,
} from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Run one deterministic assertion against the current browser page.",
  inputSchema: z.object({
    actionId: z.string().min(1),
    assertion: assertionSchema,
  }),
  async execute({ actionId, assertion }) {
    const stepStatus = recordVerificationStep();
    if (!stepStatus.ok) {
      return {
        ok: false,
        limitReached: true,
        limitReason: stepStatus.reason,
      };
    }

    const harness = await ensureHarnessLaunched();
    const result = await harness.execute({
      actionId,
      type: "assert",
      assertion,
    });

    if (result.assertionResult) {
      recordAssertionResult(result.assertionResult);
    }

    return {
      ok: result.ok,
      error: result.error,
      assertionResult: result.assertionResult,
      observation: result.observation,
    };
  },
});

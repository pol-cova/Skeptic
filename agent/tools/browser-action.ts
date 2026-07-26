import { browserActionSchema, validateBrowserAction } from "@skeptic/core";
import { defineTool } from "eve/tools";

import {
  ensureHarnessLaunched,
  recordAssertionResult,
  recordVerificationStep,
} from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Execute one typed browser action against the authorized application origin.",
  inputSchema: browserActionSchema,
  async execute(action) {
    const validation = validateBrowserAction(action);
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          code: "INVALID_ACTION",
          message: validation.error,
        },
        needsAdaptation: true,
      };
    }

    const stepStatus = recordVerificationStep();
    if (!stepStatus.ok) {
      return {
        ok: false,
        limitReached: true,
        limitReason: stepStatus.reason,
        needsAdaptation: false,
      };
    }

    const harness = await ensureHarnessLaunched();
    const result = await harness.execute(validation.action);

    if (result.assertionResult) {
      recordAssertionResult(result.assertionResult);
    }

    return {
      ok: result.ok,
      error: result.error,
      observation: result.observation,
      needsAdaptation: !result.ok,
      ...(result.assertionResult
        ? { assertionResult: result.assertionResult }
        : {}),
    };
  },
});

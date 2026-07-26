import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  ensureHarnessLaunched,
  recordVerificationStep,
} from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Inspect the current browser page and return structured observation data.",
  inputSchema: z.object({}),
  async execute() {
    const stepStatus = recordVerificationStep();
    if (!stepStatus.ok) {
      return {
        ok: false,
        limitReached: true,
        limitReason: stepStatus.reason,
      };
    }

    const harness = await ensureHarnessLaunched();
    return await harness.observe();
  },
});

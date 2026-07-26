import { browserActionSchema } from "@skeptic/core";
import { defineTool } from "eve/tools";

import { ensureHarnessLaunched } from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Execute one typed browser action against the authorized application origin.",
  inputSchema: browserActionSchema,
  async execute(action) {
    const harness = await ensureHarnessLaunched();
    const result = await harness.execute(action);

    return {
      ok: result.ok,
      error: result.error,
      observation: result.observation,
      ...(result.assertionResult
        ? { assertionResult: result.assertionResult }
        : {}),
    };
  },
});

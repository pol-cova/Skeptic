import { defineTool } from "eve/tools";
import { z } from "zod";

import { ensureHarnessLaunched } from "../lib/verification-session.ts";

export default defineTool({
  description:
    "Capture a screenshot artifact reference for the active criterion.",
  inputSchema: z.object({
    criterionIndex: z.number().int().positive(),
    label: z.string().min(1),
  }),
  async execute({ criterionIndex, label }) {
    const harness = await ensureHarnessLaunched();
    const screenshot = await harness.page.screenshot({ fullPage: true });
    const artifactRef = `screenshots/manual-${criterionIndex}-${Date.now()}.png`;

    return {
      criterionIndex,
      label,
      artifactRef,
      byteLength: screenshot.byteLength,
    };
  },
});

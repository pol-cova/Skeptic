import { Output, streamText } from "ai";
import { z } from "zod";

import { resolveSkepticModel } from "../../agent/lib/model-provider.ts";

const responseSchema = z.object({
  status: z.literal("ok"),
  summary: z.string().min(1),
});

try {
  const resolved = resolveSkepticModel();
  const result = streamText({
    model: resolved.model,
    output: Output.object({ schema: responseSchema }),
    prompt:
      'Return JSON with status "ok" and a short summary confirming Skeptic model access.',
    maxRetries: 2,
    timeout: 30_000,
  });

  console.log(
    JSON.stringify({
      provider: resolved.provider,
      modelId: resolved.modelId,
      credentialSource: resolved.credentialSource,
      result: await result.output,
    }),
  );
} catch (error) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
        ? `Provider returned HTTP ${error.statusCode}`
        : "Unknown provider error";
  console.error(`Model preflight failed: ${message}`);
  process.exitCode = 1;
}

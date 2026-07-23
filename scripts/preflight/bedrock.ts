import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, Output } from "ai";
import { spawnSync } from "node:child_process";
import { z } from "zod";

const region =
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
const modelId =
  process.env.SKEPTIC_MODEL ??
  process.env.SKEPTIC_BEDROCK_MODEL ??
  "amazon.nova-lite-v1:0";

const hasApiKey = Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK);
const hasSigV4Credentials =
  Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
  spawnSync("aws", ["sts", "get-caller-identity"], {
    stdio: "ignore",
    timeout: 10_000,
  }).status === 0;

if (!hasApiKey && !hasSigV4Credentials) {
  console.error(
    "Bedrock preflight requires AWS_BEARER_TOKEN_BEDROCK or valid AWS credentials.",
  );
  process.exit(2);
}

const provider = createAmazonBedrock({ region });
const responseSchema = z.object({
  status: z.literal("ok"),
  summary: z.string().min(1),
});

try {
  const result = await generateText({
    model: provider(modelId),
    output: Output.object({ schema: responseSchema }),
    prompt:
      'Return JSON with status "ok" and a short summary confirming this structured Bedrock preflight.',
    maxRetries: 2,
    timeout: 30_000,
  });

  console.log(
    JSON.stringify({
      modelId,
      region,
      retries: 2,
      result: result.output,
    }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Bedrock preflight failed: ${message}`);
  process.exitCode = 1;
}

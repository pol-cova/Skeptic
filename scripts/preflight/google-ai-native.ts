import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveSkepticModel } from "@skeptic/core";

// Configuration loading
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Early validation
if (!apiKey) {
  console.error(
    "❌ Google AI Native preflight requires GOOGLE_GENERATIVE_AI_API_KEY",
  );
  console.error("\n💡 Setup:");
  console.error("   1. Get API key: https://aistudio.google.com/apikey");
  console.error("   2. Set: export GOOGLE_GENERATIVE_AI_API_KEY=your_key");
  console.error("   3. Set: export SKEPTIC_PROVIDER=google-ai");
  process.exit(2);
}

// Test schema for structured output validation
const responseSchema = z.object({
  status: z.literal("ok"),
  summary: z.string().min(1),
  provider: z.string(),
});

try {
  console.log("🧪 Testing native Google AI provider...\n");

  // Use resolveSkepticModel for consistency
  const resolved = resolveSkepticModel();

  console.log("📋 Configuration:");
  console.log(`   Provider: ${resolved.provider}`);
  console.log(`   Model: ${resolved.modelId}`);
  console.log(`   Credential source: ${resolved.credentialSource}\n`);

  console.log("🚀 Sending test prompt with structured output...");

  const result = await generateText({
    model: resolved.model,
    output: Output.object({ schema: responseSchema }),
    prompt:
      'Return JSON with status "ok", provider "Google AI Native", and a summary confirming native Gemini integration.',
    maxRetries: 2,
    timeout: 30_000,
  });

  console.log("\n✅ Success! Native Google AI provider is working.\n");
  console.log("📊 Response:");
  console.log(JSON.stringify(result.output, null, 2));

  process.exitCode = 0;
} catch (error) {
  console.error("\n❌ Native Google AI preflight failed!\n");

  if (error instanceof Error) {
    console.error("Error details:");
    console.error(`   Message: ${error.message}\n`);
  }

  console.error("💡 Troubleshooting:");
  console.error("   1. Verify GOOGLE_GENERATIVE_AI_API_KEY is valid");
  console.error("   2. Check API key at: https://aistudio.google.com/apikey");
  console.error("   3. Ensure SKEPTIC_PROVIDER=google-ai");
  console.error(
    "   4. Confirm model is available (use pnpm preflight:google-ai for openai-compatible check)",
  );

  process.exitCode = 1;
}

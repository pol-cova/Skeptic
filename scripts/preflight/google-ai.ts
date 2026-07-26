import { Output, streamText } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveSkepticModel } from "@skeptic/core";

// Load .env file if it exists
try {
  const envPath = join(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log("✅ Loaded configuration from .env file\n");
} catch {
  console.log("ℹ️  No .env file found, using environment variables\n");
}

const responseSchema = z.object({
  status: z.literal("ok"),
  summary: z.string().min(1),
  provider: z.string(),
});

console.log(
  "🧪 Testing Google AI (Gemini) via openai-compatible provider...\n",
);

try {
  const resolved = resolveSkepticModel();

  console.log("📋 Configuration:");
  console.log(`   Provider: ${resolved.provider}`);
  console.log(`   Model: ${resolved.modelId}`);
  console.log(`   Credential source: ${resolved.credentialSource}\n`);

  console.log("🚀 Sending test prompt...");

  const result = streamText({
    model: resolved.model,
    output: Output.object({ schema: responseSchema }),
    prompt:
      'Return JSON with status "ok", provider "Google AI Gemini", and a short summary confirming Skeptic can access Google AI models.',
    maxRetries: 2,
    timeout: 30_000,
  });

  const output = await result.output;

  console.log("\n✅ Success! Google AI is working with Skeptic.\n");
  console.log("📊 Response:");
  console.log(JSON.stringify(output, null, 2));

  process.exitCode = 0;
} catch (error) {
  console.error("\n❌ Google AI preflight failed!\n");

  if (error instanceof Error) {
    console.error("Error details:");
    console.error(`   Message: ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack trace:`);
      console.error(`   ${error.stack.split("\n").slice(1, 4).join("\n   ")}`);
    }
  } else if (typeof error === "object" && error !== null) {
    console.error("Error object:", JSON.stringify(error, null, 2));
  } else {
    console.error("Unknown error:", error);
  }

  console.error("\n💡 Troubleshooting tips:");
  console.error("   1. Verify SKEPTIC_BASE_URL is correct for Google AI");
  console.error("   2. Check that your GOOGLE_AI_API_KEY is valid");
  console.error("   3. Ensure SKEPTIC_MODEL matches an available Gemini model");
  console.error("   4. Confirm the endpoint supports OpenAI-compatible format");

  process.exitCode = 1;
}

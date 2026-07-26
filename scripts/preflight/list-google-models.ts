// List available Google AI models via OpenAI-compatible endpoint

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load .env file
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
} catch (error) {
  console.error(
    "❌ Error reading .env file. Make sure .env exists with your Google AI configuration.",
  );
  process.exit(1);
}

const BASE_URL =
  process.env.SKEPTIC_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const API_KEY = process.env.SKEPTIC_API_KEY;

if (!API_KEY) {
  console.error("❌ SKEPTIC_API_KEY not found in .env file!");
  console.error("Please add your Google AI API key to the .env file:");
  console.error("SKEPTIC_API_KEY=your_google_ai_api_key_here");
  process.exit(1);
}

console.log("🔍 Listing available Google AI models...\n");
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
console.log("\n" + "=".repeat(60) + "\n");

const listUrl = `${BASE_URL}models`;
console.log(`📍 Models endpoint: ${listUrl}\n`);

try {
  const response = await fetch(listUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

  const responseText = await response.text();

  if (response.ok) {
    console.log("✅ Successfully retrieved model list!\n");
    const data = JSON.parse(responseText);

    if (data.data && Array.isArray(data.data)) {
      console.log(`📋 Available models (${data.data.length} total):\n`);
      data.data.forEach((model: any, index: number) => {
        console.log(`${index + 1}. ${model.id}`);
        if (model.owned_by) {
          console.log(`   Owned by: ${model.owned_by}`);
        }
        console.log("");
      });

      console.log("=".repeat(60));
      console.log("\n💡 Recommended models for Skeptic:");
      const recommended = data.data.filter(
        (m: any) => m.id.includes("flash") || m.id.includes("3.6"),
      );
      if (recommended.length > 0) {
        recommended.forEach((model: any) => {
          console.log(`  • ${model.id}`);
        });
      } else {
        console.log("  • Check the list above for 'flash' or 'pro' models");
      }
    } else {
      console.log("📄 Raw response:");
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.log("❌ Failed to retrieve models!");
    console.log("\n📄 Response:");
    console.log(responseText);
  }
} catch (error) {
  console.error("❌ Error:", error);
}

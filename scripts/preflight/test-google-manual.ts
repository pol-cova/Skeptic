// Test manual con valores desde .env para diagnosticar

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
const MODEL = process.env.SKEPTIC_MODEL || "gemini-1.5-flash";

if (!API_KEY) {
  console.error("❌ SKEPTIC_API_KEY not found in .env file!");
  console.error("Please add your Google AI API key to the .env file:");
  console.error("SKEPTIC_API_KEY=your_google_ai_api_key_here");
  process.exit(1);
}

console.log("🧪 Testing Google AI with values from .env...\n");
console.log(`Base URL: ${BASE_URL}`);
console.log(`Model: ${MODEL}`);
console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
console.log("\n" + "=".repeat(60) + "\n");

const testUrl = `${BASE_URL}chat/completions`;
console.log(`📍 Full URL: ${testUrl}\n`);

const requestBody = {
  model: MODEL,
  messages: [
    {
      role: "user",
      content:
        "Say 'Hello from Skeptic!' in JSON format with a 'message' field",
    },
  ],
  temperature: 0.7,
  max_tokens: 100,
};

console.log("📤 Request:");
console.log(JSON.stringify(requestBody, null, 2));
console.log("\n" + "=".repeat(60) + "\n");

try {
  const response = await fetch(testUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

  const responseText = await response.text();
  console.log("📄 Response:");
  console.log(responseText);
  console.log("\n" + "=".repeat(60) + "\n");

  if (response.ok) {
    console.log("✅ SUCCESS! Google AI is working!");
    try {
      const data = JSON.parse(responseText);
      if (data.choices && data.choices[0]) {
        console.log("\n💬 AI Response:");
        console.log(data.choices[0].message.content);
      }
    } catch (e) {
      console.log("Response is not JSON, but API call succeeded");
    }
  } else {
    console.log("❌ API call failed!");

    if (response.status === 400) {
      console.log("\n💡 Status 400 usually means:");
      console.log("  • Invalid request format");
      console.log("  • Model name incorrect");
      console.log("  • Parameter not supported");
    } else if (response.status === 401) {
      console.log("\n💡 Status 401 means:");
      console.log("  • API key is invalid or expired");
      console.log("  • Get a new key at: https://aistudio.google.com/apikey");
    } else if (response.status === 403) {
      console.log("\n💡 Status 403 means:");
      console.log("  • API key doesn't have permission for this model");
      console.log("  • Check your Google AI Studio quotas");
    } else if (response.status === 404) {
      console.log("\n💡 Status 404 means:");
      console.log("  • The endpoint URL is incorrect");
      console.log("  • Or the model doesn't exist");
    }
  }
} catch (error) {
  console.error("❌ Network error:", error);
  console.log("\n💡 Possible issues:");
  console.log("  • Check your internet connection");
  console.log("  • Verify firewall settings");
}

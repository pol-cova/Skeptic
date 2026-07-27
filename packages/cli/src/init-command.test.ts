import { describe, expect, it } from "vitest";

import { listInitProviders, runInitCommand } from "./init-command.ts";

describe("init command", () => {
  it("defaults to the local ChatGPT subscription path", () => {
    const result = runInitCommand({}, {});

    expect(result.provider).toBe("chatgpt");
    expect(result.credentialSource).toContain("codex login");
    expect(result.setup).toContain("No AWS account");
    expect(result.validated).toBe(true);
  });

  it("names the required BYOC environment variable and validates it", () => {
    const missing = runInitCommand({ provider: "openrouter" }, {});
    expect(missing.credentialSource).toBe("OPENROUTER_API_KEY");
    expect(missing.validated).toBe(false);

    const present = runInitCommand(
      { provider: "openrouter" },
      { OPENROUTER_API_KEY: "test-key" },
    );
    expect(present.validated).toBe(true);
  });

  it("lists every supported provider with credential guidance", () => {
    const providers = listInitProviders();
    expect(providers.map((entry) => entry.id)).toEqual([
      "chatgpt",
      "openrouter",
      "cerebras",
      "bedrock",
      "openai-compatible",
      "google-ai",
    ]);
    expect(
      providers.find((entry) => entry.id === "google-ai")?.credentialSource,
    ).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
  });
});

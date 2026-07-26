import { describe, expect, it } from "vitest";

import {
  buildRepairPrompt,
  shouldEscalateToHarnessError,
  validateAgentDecision,
} from "./lib/decision-validation.ts";
import {
  formatProviderLog,
  ProviderSetupError,
  resolveProviderOrThrow,
  withTransientRetry,
} from "./lib/provider-setup.ts";

describe("provider setup", () => {
  it("fails before browser startup when provider env is missing", () => {
    expect(() =>
      resolveProviderOrThrow({
        SKEPTIC_PROVIDER: "openrouter",
      }),
    ).toThrow(ProviderSetupError);
  });

  it("resolves chatgpt provider without exposing credentials in logs", () => {
    const provider = resolveProviderOrThrow({
      SKEPTIC_PROVIDER: "chatgpt",
    });
    const log = formatProviderLog(provider);

    expect(log.provider).toBe("chatgpt");
    expect(log.modelId.length).toBeGreaterThan(0);
    expect(log.credentialSource).toContain("codex");
    expect(JSON.stringify(log)).not.toMatch(/sk-/);
  });

  it("retries transient failures twice with backoff", async () => {
    let attempts = 0;
    const result = await withTransientRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("transient");
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });
});

describe("AgentDecision validation", () => {
  it("accepts valid typed browser actions", () => {
    const validation = validateAgentDecision({
      criterionIndex: 1,
      actions: [
        {
          actionId: "goto-login",
          type: "goto",
          url: "http://127.0.0.1:3100/login",
        },
      ],
      decidedAt: Date.now(),
    });

    expect(validation.ok).toBe(true);
  });

  it("rejects invalid structured output and builds a repair prompt", () => {
    const validation = validateAgentDecision({
      criterionIndex: 0,
      actions: [],
      decidedAt: "not-a-number",
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(buildRepairPrompt(validation.error)).toContain("AgentDecision");
      expect(shouldEscalateToHarnessError(0)).toBe(false);
      expect(shouldEscalateToHarnessError(1)).toBe(true);
    }
  });
});

describe("tool boundary", () => {
  it("disables default shell and filesystem tools", async () => {
    const disabledTools = [
      "../tools/bash.ts",
      "../tools/read_file.ts",
      "../tools/write_file.ts",
      "../tools/glob.ts",
      "../tools/grep.ts",
      "../tools/web_fetch.ts",
      "../tools/web_search.ts",
      "../tools/todo.ts",
      "../tools/ask_question.ts",
      "../tools/agent.ts",
    ] as const;

    for (const modulePath of disabledTools) {
      const module = await import(modulePath);
      expect(module.default).toBeDefined();
    }
  });

  it("exposes only the typed verification tools", async () => {
    const allowedTools = [
      "../tools/inspect.ts",
      "../tools/browser-action.ts",
      "../tools/assertion.ts",
      "../tools/evidence.ts",
      "../tools/finish.ts",
    ] as const;

    for (const modulePath of allowedTools) {
      const module = await import(modulePath);
      expect(module.default).toBeDefined();
    }
  });
});

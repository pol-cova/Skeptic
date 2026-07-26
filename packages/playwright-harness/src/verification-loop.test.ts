import { describe, expect, it, vi } from "vitest";

import { PlaywrightHarness } from "./harness.ts";
import {
  isValidBrowserAction,
  VerificationLoopRunner,
} from "./verification-loop.ts";

describe("VerificationLoopRunner", () => {
  it("rejects invalid actions before Playwright execution", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
    });

    await harness.launch();

    try {
      const executeSpy = vi.spyOn(harness, "execute");
      const loop = new VerificationLoopRunner(harness, {
        criterionIndex: 1,
        hypothesis: "Invalid actions never execute.",
      });

      const result = await loop.act({
        actionId: "bad",
        type: "click",
      } as never);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ACTION");
      expect(executeSpy).not.toHaveBeenCalled();
    } finally {
      await harness.close();
    }
  });

  it("recovers from one missing element using a fallback action", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
    });

    await harness.launch();

    try {
      await harness.page.setContent(
        `<button role="alert">Validation failed</button>`,
      );

      const loop = new VerificationLoopRunner(harness, {
        criterionIndex: 1,
        hypothesis: "Fallback target can satisfy the wait step.",
      });

      const result = await loop.actWithRecovery(
        {
          actionId: "wait-primary",
          type: "waitFor",
          target: { testId: "missing-target" },
          timeoutMs: 500,
        },
        {
          actionId: "wait-fallback",
          type: "waitFor",
          target: { role: "alert" },
          timeoutMs: 500,
        },
      );

      expect(result.ok).toBe(true);
    } finally {
      await harness.close();
    }
  });

  it("identifies valid browser actions with the shared schema", () => {
    expect(
      isValidBrowserAction({
        actionId: "goto",
        type: "goto",
        url: "http://127.0.0.1:3100/login",
      }),
    ).toBe(true);
    expect(isValidBrowserAction({ actionId: "bad", type: "click" })).toBe(
      false,
    );
  });
});

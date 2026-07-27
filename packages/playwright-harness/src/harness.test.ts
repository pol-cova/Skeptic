import { describe, expect, it } from "vitest";

import { PlaywrightHarness } from "./harness.ts";

describe("PlaywrightHarness", () => {
  it("rejects schema-invalid actions without executing them", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
    });

    await harness.launch();

    try {
      const result = await harness.execute({
        actionId: "bad-action",
        type: "click",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_ACTION");
    } finally {
      await harness.close();
    }
  });

  it("rejects off-origin goto without navigation", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
    });

    await harness.launch();

    try {
      const result = await harness.execute({
        actionId: "goto-evil",
        type: "goto",
        url: "https://example.com",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("ORIGIN_VIOLATION");
      expect(harness.page.url()).toBe("about:blank");
    } finally {
      await harness.close();
    }
  });
});

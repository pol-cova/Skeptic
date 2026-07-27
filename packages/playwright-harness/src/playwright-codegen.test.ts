import { describe, expect, it } from "vitest";

import { buildDemoReplayFixture } from "./replay-fixtures.ts";
import {
  generatePlaywrightSpec,
  generatePlaywrightSpecFromFixture,
} from "./playwright-codegen.ts";

describe("playwright codegen", () => {
  it("generates test titles with criterion id and source text", () => {
    const fixture = buildDemoReplayFixture({
      baseUrl: "http://127.0.0.1:3100",
      allowedOrigins: ["http://127.0.0.1:3100"],
      username: "demo",
      password: "secret",
      inviteEmail: "replay@example.com",
    });

    const spec = generatePlaywrightSpec(fixture);

    expect(spec).toContain("test('[1]");
    expect(spec).toContain("validation message");
    expect(spec).toContain("test('[2]");
    expect(spec).toContain("Pending invitations");
    expect(spec).toContain("test('[3]");
    expect(spec).toContain("duplicate-invitation");
    expect(spec).toContain("getByTestId('invite-email')");
    expect(spec).not.toContain("{{");
  });

  it("fails explicitly for unsupported traces", () => {
    expect(() =>
      generatePlaywrightSpecFromFixture({
        version: 1,
        baseUrl: "http://127.0.0.1:3100",
        allowedOrigins: ["http://127.0.0.1:3100"],
        generatedAt: Date.now(),
        criteria: [
          {
            criterionIndex: 1,
            sourceText: "Broken trace",
            steps: [
              {
                actionId: "wait",
                type: "waitFor",
                timeoutMs: 1000,
              },
            ],
          },
        ],
      }),
    ).toThrow(/Unsupported trace/);
  });
});

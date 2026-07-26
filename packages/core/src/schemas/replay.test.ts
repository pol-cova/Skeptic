import { describe, expect, it } from "vitest";

import {
  assertReplayableActions,
  parseReplayFixture,
  ReplayGenerationError,
} from "./replay.ts";

const validFixture = {
  version: 1 as const,
  baseUrl: "http://127.0.0.1:3100",
  allowedOrigins: ["http://127.0.0.1:3100"],
  generatedAt: Date.now(),
  criteria: [
    {
      criterionIndex: 1,
      sourceText: "Invalid email shows validation.",
      steps: [
        {
          actionId: "fill",
          type: "fill" as const,
          target: { testId: "invite-email" },
          value: "bad",
        },
        {
          actionId: "assert-visible",
          type: "assert" as const,
          assertion: {
            type: "visible" as const,
            target: { testId: "invite-validation-error" },
          },
        },
      ],
    },
  ],
};

describe("replay fixture schema", () => {
  it("parses a valid fixture", () => {
    const fixture = parseReplayFixture(validFixture);
    expect(fixture.criteria).toHaveLength(1);
  });

  it("rejects fixtures with unsupported actions", () => {
    expect(() =>
      assertReplayableActions([
        {
          actionId: "bad",
          type: "fill",
          target: {},
          value: "x",
        },
      ]),
    ).toThrow(ReplayGenerationError);
  });

  it("rejects invalid version", () => {
    expect(() => parseReplayFixture({ ...validFixture, version: 2 })).toThrow(
      ReplayGenerationError,
    );
  });
});

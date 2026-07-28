import { describe, expect, it } from "vitest";

import type { PersistedRunBundle } from "@skeptic/core";

import {
  FIX_PROMPT_FILENAME,
  needsFixPrompt,
  renderFixPrompt,
  writeFixPrompt,
} from "./fix-prompt.ts";

const bundleWithFailures: PersistedRunBundle = {
  metadata: {
    runId: "verify-123",
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_100_000,
    readiness: "NOT_READY",
    config: {
      app: {
        baseUrl: "http://127.0.0.1:3000",
        startCommand: "npm run dev",
        readyPath: "/health",
        allowedOrigins: ["http://127.0.0.1:3000"],
      },
      criteria: {
        file: "acceptance.md",
        maxCriteria: 3,
      },
    },
    criteria: [
      {
        index: 1,
        sourceText: "User reaches dashboard",
        prerequisites: [],
      },
      {
        index: 2,
        sourceText: "Invalid login shows error",
        prerequisites: [],
      },
      {
        index: 3,
        sourceText: "Duplicate invite rejected",
        prerequisites: [2],
      },
    ],
    verdicts: [
      {
        criterionIndex: 1,
        sourceText: "User reaches dashboard",
        verdict: "PASS",
        explanation: "Dashboard visible.",
      },
      {
        criterionIndex: 2,
        sourceText: "Invalid login shows error",
        verdict: "FAIL",
        explanation: "Expected login error visible, element not found.",
        assertionResults: [
          {
            assertion: {
              type: "visible",
              target: { testId: "login-error" },
            },
            passed: false,
            expected: true,
            observed: false,
            timestamp: 1_700_000_000_500,
            artifactRefs: ["screenshots/000002-2.png"],
          },
        ],
        artifactRefs: ["screenshots/000002-2.png"],
      },
      {
        criterionIndex: 3,
        sourceText: "Duplicate invite rejected",
        verdict: "UNVERIFIABLE",
        explanation: "Prerequisite 2 did not pass.",
        prerequisiteFailure: {
          index: 2,
          reason: "login error never appeared",
        },
      },
    ],
    artifactRoot: ".proof/runs/verify-123",
  },
  events: [],
};

describe("fix prompt", () => {
  it("detects runs that need a fix prompt", () => {
    expect(needsFixPrompt(bundleWithFailures.metadata.verdicts ?? [])).toBe(
      true,
    );
    expect(
      needsFixPrompt([
        {
          criterionIndex: 1,
          sourceText: "ok",
          verdict: "PASS",
          explanation: "ok",
        },
      ]),
    ).toBe(false);
  });

  it("renders structured remediation for FAIL and UNVERIFIABLE criteria", () => {
    const markdown = renderFixPrompt(bundleWithFailures);

    expect(markdown).toContain("# Skeptic fix prompt");
    expect(markdown).toContain("verify-123");
    expect(markdown).toContain("NOT_READY");
    expect(markdown).toContain("## Criterion 2 — FAIL");
    expect(markdown).toContain("Invalid login shows error");
    expect(markdown).toContain("screenshots/000002-2.png");
    expect(markdown).toContain("visible assertion failed");
    expect(markdown).toContain("## Criterion 3 — UNVERIFIABLE");
    expect(markdown).toContain("Fix criterion 2 first");
    expect(markdown).toContain("does **not** auto-repair");
    expect(markdown).not.toContain("## Criterion 1 — PASS");
  });

  it("writes fix-prompt.md when actionable verdicts exist", async () => {
    const artifactRoot = await import("node:os").then((os) =>
      import("node:path").then(({ join }) =>
        join(os.tmpdir(), `skeptic-fix-prompt-${Date.now()}`),
      ),
    );

    const result = await writeFixPrompt(bundleWithFailures, { artifactRoot });
    expect(result?.fixPromptPath).toContain(FIX_PROMPT_FILENAME);

    const { readFile, rm } = await import("node:fs/promises");
    const content = await readFile(result!.fixPromptPath, "utf8");
    expect(content).toContain("Suggested fix steps");

    await rm(artifactRoot, { recursive: true, force: true });
  });

  it("skips writing when all criteria pass", async () => {
    const passOnly: PersistedRunBundle = {
      ...bundleWithFailures,
      metadata: {
        ...bundleWithFailures.metadata,
        readiness: "READY",
        verdicts: [
          {
            criterionIndex: 1,
            sourceText: "User reaches dashboard",
            verdict: "PASS",
            explanation: "Dashboard visible.",
          },
        ],
      },
    };

    const artifactRoot = await import("node:os").then((os) =>
      import("node:path").then(({ join }) =>
        join(os.tmpdir(), `skeptic-fix-prompt-pass-${Date.now()}`),
      ),
    );

    const result = await writeFixPrompt(passOnly, { artifactRoot });
    expect(result).toBeNull();
  });
});

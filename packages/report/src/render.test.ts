import { describe, expect, it } from "vitest";

import type { PersistedRunBundle } from "@skeptic/core";

import { renderHtmlReport, renderMarkdownReport } from "./render.ts";

const sampleBundle: PersistedRunBundle = {
  metadata: {
    runId: "test-run",
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_100_000,
    readiness: "NOT_READY",
    config: {
      app: {
        baseUrl: "http://127.0.0.1:3100",
        startCommand: "pnpm demo:dev",
        readyPath: "/health",
        allowedOrigins: ["http://127.0.0.1:3100"],
      },
      criteria: {
        file: "acceptance.md",
        maxCriteria: 3,
      },
    },
    criteria: [
      {
        index: 1,
        sourceText: "Criterion one",
        prerequisites: [],
      },
    ],
    verdicts: [
      {
        criterionIndex: 1,
        sourceText: "Criterion one",
        verdict: "PASS",
        explanation: "Deterministic assertions passed.",
      },
      {
        criterionIndex: 2,
        sourceText: "Criterion two",
        verdict: "FAIL",
        explanation: "Expected count 1, observed 0.",
      },
    ],
    artifactRoot: ".proof/runs/test-run",
  },
  events: [],
};

describe("report renderer", () => {
  it("renders markdown with readiness and verdicts", () => {
    const markdown = renderMarkdownReport(sampleBundle);
    expect(markdown).toContain("NOT_READY");
    expect(markdown).toContain("- **Exit code:** 1");
    expect(markdown).toContain("Criterion two");
  });

  it("renders html with verdict classes", () => {
    const html = renderHtmlReport(sampleBundle);
    expect(html).toContain('class="pass"');
    expect(html).toContain('class="fail"');
    expect(html).toContain("replay.json");
  });
});

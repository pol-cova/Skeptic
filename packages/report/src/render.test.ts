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
        assertionResults: [
          {
            assertion: { type: "count", target: { role: "row" }, expected: 1 },
            passed: true,
            expected: 1,
            observed: 1,
            timestamp: 1_700_000_000_500,
            artifactRefs: ["screenshots/000001-1.png"],
          },
        ],
        artifactRefs: ["screenshots/000001-1.png"],
      },
      {
        criterionIndex: 2,
        sourceText: "Criterion two",
        verdict: "FAIL",
        explanation: "Expected count 1, observed 0.",
        assertionResults: [
          {
            assertion: { type: "count", target: { role: "row" }, expected: 1 },
            passed: false,
            expected: 1,
            observed: 0,
            timestamp: 1_700_000_000_600,
            artifactRefs: ["screenshots/000002-2.png"],
          },
        ],
        artifactRefs: ["screenshots/000002-2.png"],
      },
      {
        criterionIndex: 3,
        sourceText: "Criterion three",
        verdict: "UNVERIFIABLE",
        explanation: "Prerequisite 2 missing: invite never persisted.",
        prerequisiteFailure: {
          index: 2,
          reason: "invite never persisted",
        },
      },
      {
        criterionIndex: 4,
        sourceText: "<script>alert('x')</script>",
        verdict: "HARNESS_ERROR",
        explanation: "Screenshot write failed.",
      },
    ],
    artifactRoot: ".proof/runs/test-run",
  },
  events: [
    {
      runId: "test-run",
      sequence: 0,
      timestamp: 1_700_000_000_100,
      actor: "harness",
      type: "run.started",
      payload: { criteriaCount: 3 },
    },
    {
      runId: "test-run",
      sequence: 1,
      timestamp: 1_700_000_000_200,
      actor: "oracle",
      type: "assertion.checked",
      payload: { passed: false },
      criterionIndex: 2,
      artifactRefs: ["screenshots/000002-2.png"],
    },
  ],
};

describe("report renderer", () => {
  it("renders markdown with readiness, timeline, and demo comparison", () => {
    const markdown = renderMarkdownReport(sampleBundle);
    expect(markdown).toContain("NOT_READY");
    expect(markdown).toContain("- **Exit code:** 1");
    expect(markdown).toContain("Criterion two");
    expect(markdown).toContain("screenshots/000002-2.png");
    expect(markdown).toContain("Broken | PASS | FAIL | UNVERIFIABLE");
    expect(markdown).toContain("`run.started`");
  });

  it("links PASS and FAIL criteria to assertions and artifacts", () => {
    const markdown = renderMarkdownReport(sampleBundle);
    expect(markdown).toContain("Assertion 1: count (passed)");
    expect(markdown).toContain(
      "[screenshots/000001-1.png](screenshots/000001-1.png)",
    );
    expect(markdown).toContain("Assertion 1: count (failed)");
  });

  it("explains UNVERIFIABLE and HARNESS_ERROR without implying product failure", () => {
    const markdown = renderMarkdownReport(sampleBundle);
    expect(markdown).toContain("not necessarily a product defect");
    expect(markdown).toContain("Prerequisite blocked");
    expect(markdown).toContain("not a product verdict");
  });

  it("escapes model-derived HTML in reports", () => {
    const html = renderHtmlReport(sampleBundle);
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert('x')</script>");
  });

  it("includes accessibility and keyboard navigation affordances", () => {
    const html = renderHtmlReport(sampleBundle);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('role="main"');
    expect(html).toContain('aria-label="Verdict PASS"');
    expect(html).toContain(":focus-visible");
    expect(html).toContain('class="badge pass"');
    expect(html).toContain('class="badge fail"');
  });

  it("uses relative artifact links suitable for opening from disk", () => {
    const html = renderHtmlReport(sampleBundle);
    expect(html).toContain('href="events.jsonl"');
    expect(html).toContain('href="screenshots/000001-1.png"');
    expect(html).not.toContain("https://github.com");
  });
});

import escapeHtml from "escape-html";

import {
  exitCodeFor,
  readinessFor,
  type AssertionResult,
  type CriterionVerdict,
  type PersistedRunBundle,
  type Verdict,
} from "@skeptic/core";

export interface ReportPaths {
  htmlPath: string;
  markdownPath: string;
}

type RunEvent = PersistedRunBundle["events"][number];

const PRIVACY_NOTICE =
  "This report may contain screenshots, URLs, and UI text from the application under test. " +
  "Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.";

const VERDICT_GUIDANCE: Record<Verdict, string> = {
  PASS: "Deterministic assertions prove this criterion.",
  FAIL: "Deterministic assertions disprove this criterion.",
  UNVERIFIABLE:
    "A prerequisite was missing or evidence was incomplete. This is not necessarily a product defect.",
  HARNESS_ERROR:
    "Skeptic could not complete reliable verification. This is not a product verdict.",
};

function verdictClass(verdict: string): string {
  switch (verdict) {
    case "PASS":
      return "pass";
    case "FAIL":
      return "fail";
    case "UNVERIFIABLE":
      return "unverifiable";
    case "HARNESS_ERROR":
      return "error";
    default:
      return "unknown";
  }
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

function formatAssertion(assertion: AssertionResult): string {
  const status = assertion.passed ? "passed" : "failed";
  const type = assertion.assertion.type;
  return `${type} (${status})`;
}

function formatAssertionDetail(assertion: AssertionResult): string {
  const parts = [formatAssertion(assertion)];
  if (assertion.expected !== undefined) {
    parts.push(`expected ${JSON.stringify(assertion.expected)}`);
  }
  if (assertion.observed !== undefined) {
    parts.push(`observed ${JSON.stringify(assertion.observed)}`);
  }
  return parts.join(" · ");
}

function collectArtifactRefs(entry: CriterionVerdict): string[] {
  const refs = new Set<string>();
  for (const ref of entry.artifactRefs ?? []) {
    refs.add(ref);
  }
  for (const result of entry.assertionResults ?? []) {
    for (const ref of result.artifactRefs ?? []) {
      refs.add(ref);
    }
  }
  return [...refs];
}

function requiresEvidenceLinks(verdict: Verdict): boolean {
  return verdict === "PASS" || verdict === "FAIL";
}

function renderMarkdownArtifactLink(ref: string): string {
  return `- [${ref}](${ref})`;
}

function renderMarkdownAssertions(entry: CriterionVerdict): string[] {
  const assertions = entry.assertionResults ?? [];
  if (assertions.length === 0) {
    return requiresEvidenceLinks(entry.verdict)
      ? ["_No assertion results recorded._"]
      : [];
  }

  return assertions.map((result, index) => {
    const refs =
      result.artifactRefs && result.artifactRefs.length > 0
        ? ` (${result.artifactRefs.map((ref) => `[${ref}](${ref})`).join(", ")})`
        : "";
    return `- Assertion ${index + 1}: ${formatAssertionDetail(result)}${refs}`;
  });
}

function renderMarkdownCriterion(entry: CriterionVerdict): string {
  const lines = [
    `### [${entry.criterionIndex}] ${entry.verdict}`,
    ``,
    `> ${VERDICT_GUIDANCE[entry.verdict]}`,
    ``,
    entry.sourceText,
    ``,
    entry.explanation,
  ];

  if (entry.prerequisiteFailure) {
    lines.push(
      ``,
      `**Prerequisite blocked:** criterion ${entry.prerequisiteFailure.index} — ${entry.prerequisiteFailure.reason}`,
    );
  }

  const assertionLines = renderMarkdownAssertions(entry);
  if (assertionLines.length > 0) {
    lines.push(``, `**Assertions**`, ``, ...assertionLines);
  }

  const artifactRefs = collectArtifactRefs(entry);
  if (artifactRefs.length > 0) {
    lines.push(
      ``,
      `**Artifacts**`,
      ``,
      ...artifactRefs.map((ref) => renderMarkdownArtifactLink(ref)),
    );
  }

  return lines.join("\n");
}

function renderMarkdownTimeline(events: readonly RunEvent[]): string[] {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) {
    return ["_No timeline events recorded._"];
  }

  return sorted.map((event) => {
    const criterion =
      event.criterionIndex !== undefined
        ? ` · criterion ${event.criterionIndex}`
        : "";
    const refs =
      event.artifactRefs && event.artifactRefs.length > 0
        ? ` · ${event.artifactRefs.map((ref) => `[${ref}](${ref})`).join(", ")}`
        : "";
    return `- \`${event.sequence}\` ${formatTimestamp(event.timestamp)} · **${event.actor}** · \`${event.type}\`${criterion}${refs}`;
  });
}

function renderDemoComparisonMarkdown(): string[] {
  return [
    `| Phase | C1 | C2 | C3 | Readiness | Exit |`,
    `| --- | --- | --- | --- | --- | --- |`,
    `| Broken | PASS | FAIL | UNVERIFIABLE | NOT_READY | 1 |`,
    `| Fixed | PASS | PASS | PASS | READY | 0 |`,
    ``,
    `Enable the fixed demo with \`pnpm --filter demo-app dev:fixed\` or \`DEMO_PERSIST_INVITATIONS=true\`.`,
  ];
}

export function renderMarkdownReport(bundle: PersistedRunBundle): string {
  const { metadata } = bundle;
  const verdicts = metadata.verdicts ?? [];
  const readiness =
    metadata.readiness ?? readinessFor(verdicts.map((v) => v.verdict));
  const exitCode = exitCodeFor(readiness);

  const lines = [
    `# Skeptic Run Report`,
    ``,
    `> ${PRIVACY_NOTICE}`,
    ``,
    `- **Run ID:** \`${metadata.runId}\``,
    `- **Readiness:** ${readiness}`,
    `- **Exit code:** ${exitCode}`,
    `- **Started:** ${formatTimestamp(metadata.startedAt)}`,
    ...(metadata.finishedAt
      ? [`- **Finished:** ${formatTimestamp(metadata.finishedAt)}`]
      : []),
    `- **Artifact root:** \`${metadata.artifactRoot}\``,
    ``,
    `## Reference demo (broken vs fixed)`,
    ``,
    ...renderDemoComparisonMarkdown(),
    ``,
    `## Criteria`,
    ``,
    ...verdicts.flatMap((entry) => [renderMarkdownCriterion(entry), ``]),
    `## Timeline`,
    ``,
    ...renderMarkdownTimeline(bundle.events),
    ``,
    `## Bundle artifacts`,
    ``,
    `- [events.jsonl](events.jsonl)`,
    `- [metadata.json](metadata.json)`,
    `- [replay.json](replay.json)`,
    `- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)`,
    `- [report.html](report.html)`,
  ];

  return lines.join("\n");
}

function renderHtmlArtifactLinks(refs: readonly string[]): string {
  if (refs.length === 0) {
    return `<p class="muted">No linked artifacts.</p>`;
  }

  return `<ul>${refs
    .map(
      (ref) =>
        `<li><a href="${escapeHtml(ref)}">${escapeHtml(ref)}</a></li>`,
    )
    .join("")}</ul>`;
}

function renderHtmlAssertions(entry: CriterionVerdict): string {
  const assertions = entry.assertionResults ?? [];
  if (assertions.length === 0) {
    if (!requiresEvidenceLinks(entry.verdict)) {
      return "";
    }
    return `<p class="muted">No assertion results recorded.</p>`;
  }

  return `<ul class="assertions">${assertions
    .map((result, index) => {
      const refs = result.artifactRefs ?? [];
      const refLinks =
        refs.length > 0
          ? ` · ${refs
              .map(
                (ref) =>
                  `<a href="${escapeHtml(ref)}">${escapeHtml(ref)}</a>`,
              )
              .join(", ")}`
          : "";
      return `<li id="criterion-${entry.criterionIndex}-assertion-${index + 1}">
  <span class="badge ${result.passed ? "pass" : "fail"}" aria-label="${result.passed ? "Assertion passed" : "Assertion failed"}">${result.passed ? "PASS" : "FAIL"}</span>
  ${escapeHtml(formatAssertionDetail(result))}${refLinks}
</li>`;
    })
    .join("")}</ul>`;
}

function renderHtmlCriterion(entry: CriterionVerdict): string {
  const artifactRefs = collectArtifactRefs(entry);
  const guidance = VERDICT_GUIDANCE[entry.verdict];

  return `<section class="criterion" id="criterion-${entry.criterionIndex}" aria-labelledby="criterion-${entry.criterionIndex}-heading">
  <h3 id="criterion-${entry.criterionIndex}-heading">
    <span class="badge ${verdictClass(entry.verdict)}" aria-label="Verdict ${entry.verdict}">${escapeHtml(entry.verdict)}</span>
    Criterion ${entry.criterionIndex}
  </h3>
  <p class="guidance">${escapeHtml(guidance)}</p>
  <blockquote>${escapeHtml(entry.sourceText)}</blockquote>
  <p>${escapeHtml(entry.explanation)}</p>
  ${
    entry.prerequisiteFailure
      ? `<p class="cause"><strong>Prerequisite blocked:</strong> criterion ${escapeHtml(String(entry.prerequisiteFailure.index))} — ${escapeHtml(entry.prerequisiteFailure.reason)}</p>`
      : ""
  }
  <h4>Assertions</h4>
  ${renderHtmlAssertions(entry)}
  <h4>Artifacts</h4>
  ${renderHtmlArtifactLinks(artifactRefs)}
</section>`;
}

function renderHtmlTimeline(events: readonly RunEvent[]): string {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) {
    return `<p class="muted">No timeline events recorded.</p>`;
  }

  const rows = sorted
    .map((event) => {
      const refs = event.artifactRefs ?? [];
      const refCell =
        refs.length > 0
          ? refs
              .map(
                (ref) =>
                  `<a href="${escapeHtml(ref)}">${escapeHtml(ref)}</a>`,
              )
              .join(", ")
          : "—";
      return `<tr>
  <th scope="row">${event.sequence}</th>
  <td><time datetime="${escapeHtml(formatTimestamp(event.timestamp))}">${escapeHtml(formatTimestamp(event.timestamp))}</time></td>
  <td>${escapeHtml(event.actor)}</td>
  <td><code>${escapeHtml(event.type)}</code></td>
  <td>${event.criterionIndex ?? "—"}</td>
  <td>${refCell}</td>
</tr>`;
    })
    .join("\n");

  return `<table>
  <thead>
    <tr>
      <th scope="col">Seq</th>
      <th scope="col">Time</th>
      <th scope="col">Actor</th>
      <th scope="col">Type</th>
      <th scope="col">Criterion</th>
      <th scope="col">Artifacts</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

function renderHtmlDemoComparison(): string {
  return `<table>
  <caption>Reference demo expectations for broken vs fixed runs</caption>
  <thead>
    <tr>
      <th scope="col">Phase</th>
      <th scope="col">C1</th>
      <th scope="col">C2</th>
      <th scope="col">C3</th>
      <th scope="col">Readiness</th>
      <th scope="col">Exit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Broken</th>
      <td><span class="badge pass">PASS</span></td>
      <td><span class="badge fail">FAIL</span></td>
      <td><span class="badge unverifiable">UNVERIFIABLE</span></td>
      <td>NOT_READY</td>
      <td>1</td>
    </tr>
    <tr>
      <th scope="row">Fixed</th>
      <td><span class="badge pass">PASS</span></td>
      <td><span class="badge pass">PASS</span></td>
      <td><span class="badge pass">PASS</span></td>
      <td>READY</td>
      <td>0</td>
    </tr>
  </tbody>
</table>
<p class="muted">Enable the fixed demo with <code>pnpm --filter demo-app dev:fixed</code> or <code>DEMO_PERSIST_INVITATIONS=true</code>.</p>`;
}

export function renderHtmlReport(bundle: PersistedRunBundle): string {
  const { metadata } = bundle;
  const verdicts = metadata.verdicts ?? [];
  const readiness =
    metadata.readiness ?? readinessFor(verdicts.map((v) => v.verdict));
  const exitCode = exitCodeFor(readiness);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Skeptic Report — ${escapeHtml(metadata.runId)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 0; line-height: 1.5; }
    a:focus-visible, button:focus-visible, summary:focus-visible { outline: 3px solid #06c; outline-offset: 2px; }
    .skip-link { position: absolute; left: -9999px; top: 0; background: #000; color: #fff; padding: 0.5rem 1rem; z-index: 10; }
    .skip-link:focus { left: 0; }
    main { margin: 2rem; max-width: 960px; }
    h1 { margin-bottom: 0.25rem; }
    .meta, .muted { color: #555; }
    .notice { background: #fff7e6; border: 1px solid #f0c36d; padding: 0.75rem 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    .summary { display: grid; gap: 0.25rem; margin: 1rem 0 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    thead th { background: #f5f5f5; }
    .badge { display: inline-block; padding: 0.1rem 0.45rem; border-radius: 0.25rem; border: 1px solid currentColor; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.02em; }
    .pass { color: #0a7; }
    .fail { color: #c00; }
    .unverifiable { color: #a60; }
    .error { color: #606; }
    .unknown { color: #666; }
    blockquote { margin: 0.75rem 0; padding-left: 1rem; border-left: 3px solid #ccc; }
    .criterion { margin: 1.5rem 0; padding-top: 0.5rem; border-top: 1px solid #ddd; }
    .guidance, .cause { font-size: 0.95rem; }
    .assertions { padding-left: 1.25rem; }
    nav ul { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <main id="main-content" role="main">
    <h1>Skeptic Run Report</h1>
    <p class="notice" role="note">${escapeHtml(PRIVACY_NOTICE)}</p>
    <div class="summary" aria-label="Run summary">
      <p class="meta">Run <strong>${escapeHtml(metadata.runId)}</strong></p>
      <p class="meta">Readiness <strong>${escapeHtml(readiness)}</strong> · Exit code <strong>${exitCode}</strong></p>
      <p class="meta">Started ${escapeHtml(formatTimestamp(metadata.startedAt))}${metadata.finishedAt ? ` · Finished ${escapeHtml(formatTimestamp(metadata.finishedAt))}` : ""}</p>
    </div>
    <nav aria-label="Report sections">
      <ul>
        <li><a href="#demo-comparison">Reference demo comparison</a></li>
        <li><a href="#criteria">Criteria</a></li>
        <li><a href="#timeline">Timeline</a></li>
        <li><a href="#artifacts">Bundle artifacts</a></li>
      </ul>
    </nav>
    <h2 id="demo-comparison">Reference demo (broken vs fixed)</h2>
    ${renderHtmlDemoComparison()}
    <h2 id="criteria">Criteria</h2>
    ${verdicts.map((entry) => renderHtmlCriterion(entry)).join("\n")}
    <h2 id="timeline">Timeline</h2>
    ${renderHtmlTimeline(bundle.events)}
    <h2 id="artifacts">Bundle artifacts</h2>
    <ul>
      <li><a href="events.jsonl">events.jsonl</a></li>
      <li><a href="metadata.json">metadata.json</a></li>
      <li><a href="replay.json">replay.json</a></li>
      <li><a href="generated/acceptance.spec.ts">generated/acceptance.spec.ts</a></li>
      <li><a href="report.md">report.md</a></li>
    </ul>
  </main>
</body>
</html>`;
}

export interface WriteReportOptions {
  artifactRoot: string;
}

export async function writeRunReports(
  bundle: PersistedRunBundle,
  options: WriteReportOptions,
): Promise<ReportPaths> {
  const { join } = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");

  const htmlPath = join(options.artifactRoot, "report.html");
  const markdownPath = join(options.artifactRoot, "report.md");

  await mkdir(options.artifactRoot, { recursive: true });
  await writeFile(htmlPath, renderHtmlReport(bundle), "utf8");
  await writeFile(markdownPath, renderMarkdownReport(bundle), "utf8");

  return { htmlPath, markdownPath };
}

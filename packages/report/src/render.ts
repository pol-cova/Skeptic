import escapeHtml from "escape-html";

import {
  exitCodeFor,
  readinessFor,
  type PersistedRunBundle,
  type CriterionVerdict,
} from "@skeptic/core";

export interface ReportPaths {
  htmlPath: string;
  markdownPath: string;
}

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

function renderCriterionRows(verdicts: readonly CriterionVerdict[]): string {
  return verdicts
    .map(
      (entry) => `<tr>
  <td>${escapeHtml(String(entry.criterionIndex))}</td>
  <td class="${verdictClass(entry.verdict)}">${escapeHtml(entry.verdict)}</td>
  <td>${escapeHtml(entry.sourceText)}</td>
  <td>${escapeHtml(entry.explanation)}</td>
</tr>`,
    )
    .join("\n");
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
    `- **Run ID:** ${metadata.runId}`,
    `- **Readiness:** ${readiness}`,
    `- **Exit code:** ${exitCode}`,
    `- **Started:** ${new Date(metadata.startedAt).toISOString()}`,
    ...(metadata.finishedAt
      ? [`- **Finished:** ${new Date(metadata.finishedAt).toISOString()}`]
      : []),
    ``,
    `## Criteria`,
    ``,
    ...verdicts.map(
      (entry) =>
        `### [${entry.criterionIndex}] ${entry.verdict}\n\n${entry.sourceText}\n\n${entry.explanation}`,
    ),
    ``,
    `## Artifacts`,
    ``,
    `- [events.jsonl](events.jsonl)`,
    `- [metadata.json](metadata.json)`,
    `- [replay.json](replay.json)`,
    `- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)`,
  ];

  return lines.join("\n");
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
  <title>Skeptic Report — ${escapeHtml(metadata.runId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
    h1 { margin-bottom: 0.25rem; }
    .meta { color: #444; margin-bottom: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .pass { color: #0a7; font-weight: 600; }
    .fail { color: #c00; font-weight: 600; }
    .unverifiable { color: #a60; font-weight: 600; }
    .error { color: #606; font-weight: 600; }
    ul { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>Skeptic Run Report</h1>
  <p class="meta">
    Run <strong>${escapeHtml(metadata.runId)}</strong> ·
    Readiness <strong>${escapeHtml(readiness)}</strong> ·
    Exit code <strong>${exitCode}</strong>
  </p>
  <table>
    <thead>
      <tr><th>#</th><th>Verdict</th><th>Criterion</th><th>Explanation</th></tr>
    </thead>
    <tbody>
      ${renderCriterionRows(verdicts)}
    </tbody>
  </table>
  <h2>Artifacts</h2>
  <ul>
    <li><a href="events.jsonl">events.jsonl</a></li>
    <li><a href="metadata.json">metadata.json</a></li>
    <li><a href="replay.json">replay.json</a></li>
    <li><a href="generated/acceptance.spec.ts">generated/acceptance.spec.ts</a></li>
  </ul>
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

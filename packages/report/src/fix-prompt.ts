import {
  exitCodeFor,
  readinessFor,
  type AssertionResult,
  type CriterionVerdict,
  type PersistedRunBundle,
  type Verdict,
} from "@skeptic/core";

export const FIX_PROMPT_FILENAME = "fix-prompt.md";

const FIXABLE_VERDICTS = new Set<Verdict>(["FAIL", "UNVERIFIABLE"]);

export interface FixPromptPaths {
  fixPromptPath: string;
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

function formatAssertionFailure(result: AssertionResult): string {
  const parts = [`${result.assertion.type} assertion failed`];
  if (result.expected !== undefined) {
    parts.push(`expected ${JSON.stringify(result.expected)}`);
  }
  if (result.observed !== undefined) {
    parts.push(`observed ${JSON.stringify(result.observed)}`);
  }
  return parts.join(" · ");
}

function suggestedStepsFor(entry: CriterionVerdict): string[] {
  if (entry.verdict === "FAIL") {
    const steps = [
      "Review the evidence artifacts and failing assertions below.",
      "Determine whether the product behavior or the scenario selectors/steps need to change.",
      "Update application code or `scenario.ts` until deterministic assertions would pass.",
      "Re-run: `skeptic verify --config proof.config.ts --deterministic`",
    ];
    const failedAssertions =
      entry.assertionResults?.filter((result) => !result.passed) ?? [];
    if (
      failedAssertions.some((result) => result.assertion.type === "visible")
    ) {
      steps.splice(
        2,
        0,
        "For missing elements, add or fix `data-testid` attributes and matching selectors in `scenario.ts`.",
      );
    }
    return steps;
  }

  if (entry.verdict === "UNVERIFIABLE") {
    const steps = [
      "This criterion could not be verified because prerequisites or evidence were incomplete.",
    ];
    if (entry.prerequisiteFailure) {
      steps.push(
        `Fix criterion ${entry.prerequisiteFailure.index} first: ${entry.prerequisiteFailure.reason}.`,
      );
    } else {
      steps.push(
        "Ensure required test credentials, seed data, and scenario steps are in place.",
      );
    }
    steps.push(
      "Extend `scenario.ts` so the flow can reach a deterministic assertion for this criterion.",
      "Re-run: `skeptic verify --config proof.config.ts --deterministic`",
    );
    return steps;
  }

  return [];
}

function renderCriterionSection(entry: CriterionVerdict): string[] {
  const lines = [
    `## Criterion ${entry.criterionIndex} — ${entry.verdict}`,
    "",
    "**Criterion text**",
    "",
    entry.sourceText,
    "",
    "**Verdict:** " + entry.verdict,
    "",
    "**Explanation:** " + entry.explanation,
  ];

  if (entry.prerequisiteFailure) {
    lines.push(
      "",
      "**Prerequisite blocked:**",
      "",
      `- Criterion ${entry.prerequisiteFailure.index}: ${entry.prerequisiteFailure.reason}`,
    );
  }

  const failedAssertions =
    entry.assertionResults?.filter((result) => !result.passed) ?? [];
  if (failedAssertions.length > 0) {
    lines.push("", "**Failed assertions**", "");
    for (const result of failedAssertions) {
      lines.push(`- ${formatAssertionFailure(result)}`);
    }
  }

  const artifactRefs = collectArtifactRefs(entry);
  if (artifactRefs.length > 0) {
    lines.push("", "**Evidence**", "");
    for (const ref of artifactRefs) {
      lines.push(`- \`${ref}\``);
    }
  }

  const steps = suggestedStepsFor(entry);
  if (steps.length > 0) {
    lines.push("", "**Suggested fix steps**", "");
    for (const [index, step] of steps.entries()) {
      lines.push(`${index + 1}. ${step}`);
    }
  }

  return lines;
}

export function needsFixPrompt(verdicts: readonly CriterionVerdict[]): boolean {
  return verdicts.some((entry) => FIXABLE_VERDICTS.has(entry.verdict));
}

export function renderFixPrompt(bundle: PersistedRunBundle): string {
  const { metadata } = bundle;
  const verdicts = metadata.verdicts ?? [];
  const actionable = verdicts.filter((entry) =>
    FIXABLE_VERDICTS.has(entry.verdict),
  );
  const readiness =
    metadata.readiness ?? readinessFor(verdicts.map((entry) => entry.verdict));
  const exitCode = exitCodeFor(readiness);

  const lines = [
    "# Skeptic fix prompt",
    "",
    "Give this file to your coding agent. Skeptic does **not** auto-repair code or create git commits.",
    "",
    `**Run ID:** \`${metadata.runId}\``,
    `**Readiness:** ${readiness} (exit code ${exitCode})`,
    "",
    "Fix the criteria below, then re-run deterministic verification.",
    "",
  ];

  if (actionable.length === 0) {
    lines.push("_No FAIL or UNVERIFIABLE criteria in this run._");
    return lines.join("\n");
  }

  for (const entry of actionable) {
    lines.push(...renderCriterionSection(entry), "");
  }

  lines.push(
    "---",
    "",
    "Full report: `report.html` · Replay fixture: `replay.json`",
  );

  return lines.join("\n");
}

export interface WriteFixPromptOptions {
  artifactRoot: string;
}

export async function writeFixPrompt(
  bundle: PersistedRunBundle,
  options: WriteFixPromptOptions,
): Promise<FixPromptPaths | null> {
  const verdicts = bundle.metadata.verdicts ?? [];
  if (!needsFixPrompt(verdicts)) {
    return null;
  }

  const { join } = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");

  const fixPromptPath = join(options.artifactRoot, FIX_PROMPT_FILENAME);
  await mkdir(options.artifactRoot, { recursive: true });
  await writeFile(fixPromptPath, renderFixPrompt(bundle), "utf8");

  return { fixPromptPath };
}

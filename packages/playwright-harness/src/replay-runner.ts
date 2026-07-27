import {
  deriveVerdict,
  finalizeCriterionVerdict,
  parseReplayFixture,
  shouldSkipCriterion,
  buildSkippedCriterionVerdict,
  type AssertionResult,
  type BrowserAction,
  type Criterion,
  type CriterionVerdict,
  type Readiness,
  type ReplayApiStep,
  type ReplayFixture,
} from "@skeptic/core";

import { PlaywrightHarness } from "./harness.ts";

export interface ReplayRunOptions {
  fixture: ReplayFixture;
  headless?: boolean;
  criteria?: readonly Criterion[];
}

export interface ReplayCriterionResult {
  criterionIndex: number;
  verdict: CriterionVerdict;
  assertionResults: AssertionResult[];
}

export interface ReplayRunResult {
  verdicts: CriterionVerdict[];
  readiness: Readiness;
  modelCalls: number;
}

function substituteVariables(
  value: string,
  variables: Record<string, string>,
): string {
  return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const replacement = variables[key];
    if (replacement === undefined) {
      throw new Error(`Missing replay variable: ${key}`);
    }
    return replacement;
  });
}

function substituteAction(
  action: BrowserAction,
  variables: Record<string, string>,
): BrowserAction {
  const clone = structuredClone(action);

  if (clone.type === "fill" || clone.type === "select") {
    clone.value = substituteVariables(clone.value, variables);
  }

  if (clone.type === "goto") {
    clone.url = substituteVariables(clone.url, variables);
  }

  return clone;
}

async function runApiStep(
  harness: PlaywrightHarness,
  baseUrl: string,
  step: ReplayApiStep,
): Promise<void> {
  const url = `${baseUrl}${step.path}`;
  const response =
    step.method === "POST"
      ? await harness.page.request.post(url)
      : await harness.page.request.get(url);

  if (!response.ok()) {
    throw new Error(
      `API step ${step.method} ${step.path} failed: HTTP ${response.status()}`,
    );
  }
}

export async function replayCriterionSteps(
  harness: PlaywrightHarness,
  fixture: ReplayFixture,
  criterionIndex: number,
): Promise<ReplayCriterionResult> {
  const criterion = fixture.criteria.find(
    (entry) => entry.criterionIndex === criterionIndex,
  );

  if (!criterion) {
    throw new Error(`Criterion ${criterionIndex} not found in replay fixture.`);
  }

  const variables = fixture.variables ?? {};
  const assertionResults: AssertionResult[] = [];
  const artifactRefs = [`replay/criterion-${criterionIndex}.png`];

  for (const apiStep of criterion.beforeSteps ?? []) {
    await runApiStep(harness, fixture.baseUrl, apiStep);
  }

  for (const rawStep of criterion.steps) {
    const action = substituteAction(rawStep, variables);
    const result = await harness.execute(action);

    if (result.assertionResult) {
      assertionResults.push(result.assertionResult);
    }

    if (!result.ok) {
      if (action.type === "waitFor") {
        continue;
      }

      const verdict = finalizeCriterionVerdict({
        criterionIndex,
        sourceText: criterion.sourceText,
        assertionResults,
        artifactRefs,
      });

      return { criterionIndex, verdict, assertionResults };
    }
  }

  const derived = deriveVerdict({
    criterionIndex,
    sourceText: criterion.sourceText,
    assertionResults,
    artifactRefs,
  });

  return {
    criterionIndex,
    verdict: {
      criterionIndex,
      sourceText: criterion.sourceText,
      verdict: derived.verdict,
      explanation: derived.explanation,
      assertionResults: derived.assertionResults,
      artifactRefs: derived.artifactRefs,
    },
    assertionResults,
  };
}

export async function replayFixture(
  options: ReplayRunOptions,
): Promise<ReplayRunResult> {
  const fixture = parseReplayFixture(options.fixture);
  const criteria =
    options.criteria ??
    fixture.criteria.map((entry) => ({
      index: entry.criterionIndex,
      sourceText: entry.sourceText,
      prerequisites: entry.criterionIndex === 3 ? [2] : [],
    }));

  const harness = new PlaywrightHarness({
    allowedOrigins: fixture.allowedOrigins,
    headless: options.headless ?? true,
  });

  await harness.launch();

  try {
    const priorVerdicts = new Map<number, CriterionVerdict>();
    const verdicts: CriterionVerdict[] = [];

    for (const criterion of criteria) {
      const prerequisiteFailure = shouldSkipCriterion(criterion, priorVerdicts);

      if (prerequisiteFailure) {
        const skipped = buildSkippedCriterionVerdict(
          criterion,
          prerequisiteFailure,
        );
        priorVerdicts.set(criterion.index, skipped);
        verdicts.push(skipped);
        continue;
      }

      const replayed = await replayCriterionSteps(
        harness,
        fixture,
        criterion.index,
      );
      priorVerdicts.set(criterion.index, replayed.verdict);
      verdicts.push(replayed.verdict);
    }

    const readiness = verdicts.some(
      (entry) => entry.verdict === "HARNESS_ERROR",
    )
      ? "ERROR"
      : verdicts.some((entry) => entry.verdict === "FAIL")
        ? "NOT_READY"
        : verdicts.some((entry) => entry.verdict === "UNVERIFIABLE")
          ? "INCOMPLETE"
          : "READY";

    return {
      verdicts,
      readiness,
      modelCalls: 0,
    };
  } finally {
    await harness.close();
  }
}

export async function replayFixtureFromFile(
  fixturePath: string,
  options?: Omit<ReplayRunOptions, "fixture">,
): Promise<ReplayRunResult> {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
  const fixture = parseReplayFixture(raw);
  return replayFixture({ ...options, fixture });
}

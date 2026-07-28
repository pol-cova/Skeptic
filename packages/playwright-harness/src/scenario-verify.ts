import type { Criterion, CriterionVerdict, ReplayFixture } from "@skeptic/core";
import {
  buildSkippedCriterionVerdict,
  shouldSkipCriterion,
} from "@skeptic/core";

import type { HarnessEvidenceBridge } from "./evidence-bridge.ts";
import type { PlaywrightHarness } from "./harness.ts";
import { replayCriterionSteps } from "./replay-runner.ts";

export async function executeScenarioCriterion(
  harness: PlaywrightHarness,
  bridge: HarnessEvidenceBridge,
  fixture: ReplayFixture,
  criterion: Criterion,
  priorVerdicts: ReadonlyMap<number, CriterionVerdict>,
): Promise<CriterionVerdict> {
  const prerequisiteFailure = shouldSkipCriterion(criterion, priorVerdicts);

  if (prerequisiteFailure) {
    const skipped = buildSkippedCriterionVerdict(
      criterion,
      prerequisiteFailure,
    );
    return bridge.recordCriterionResult({
      observations: [],
      assertionResults: skipped.assertionResults ?? [],
      verdict: skipped,
    });
  }

  const replayed = await replayCriterionSteps(
    harness,
    fixture,
    criterion.index,
  );

  return bridge.recordCriterionResult({
    observations: [],
    assertionResults: replayed.assertionResults,
    verdict: replayed.verdict,
  });
}

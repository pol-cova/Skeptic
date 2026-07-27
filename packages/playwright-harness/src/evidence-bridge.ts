import type {
  AssertionResult,
  CriterionVerdict,
  PageObservation,
} from "@skeptic/core";
import { finalizeCriterionVerdict } from "@skeptic/core";
import type { EvidenceStore } from "@skeptic/evidence";
import type {
  NetworkObservation,
  ScreenshotProvider,
  TraceProvider,
} from "@skeptic/evidence";

import type { PlaywrightHarness } from "./harness.ts";
import type { NetworkObservationHandler } from "./network-log.ts";

export interface CriterionEvidenceInput {
  observations: readonly PageObservation[];
  assertionResults: readonly AssertionResult[];
  verdict: CriterionVerdict;
}

export function createHarnessEvidenceProviders(harness: PlaywrightHarness): {
  screenshotProvider: ScreenshotProvider;
  traceProvider: TraceProvider;
} {
  return {
    screenshotProvider: {
      capture: async () => harness.captureScreenshot(),
    },
    traceProvider: {
      getTrace: async () => harness.exportTrace(),
    },
  };
}

/**
 * Streams harness observations, assertions, and network traffic into an
 * initialized EvidenceStore for a single verification run.
 */
export class HarnessEvidenceBridge {
  readonly #store: EvidenceStore;
  readonly #harness: PlaywrightHarness;
  readonly #runId: string;
  #networkHandler: NetworkObservationHandler | undefined;

  constructor(store: EvidenceStore, harness: PlaywrightHarness, runId: string) {
    this.#store = store;
    this.#harness = harness;
    this.#runId = runId;
  }

  attach(): void {
    this.#networkHandler = (observation: NetworkObservation) => {
      void this.#store.appendEvent({
        runId: this.#runId,
        timestamp: Date.now(),
        actor: "harness",
        type: "network.observed",
        payload: {
          method: observation.method,
          path: observation.path,
          status: observation.status,
        },
      });
    };

    this.#harness.networkLog.subscribe(this.#networkHandler);
  }

  detach(): void {
    if (this.#networkHandler) {
      this.#harness.networkLog.unsubscribe(this.#networkHandler);
      this.#networkHandler = undefined;
    }
  }

  async recordPageObservation(
    observation: PageObservation,
    criterionIndex: number,
  ): Promise<void> {
    await this.#store.appendEvent({
      runId: this.#runId,
      timestamp: Date.now(),
      actor: "harness",
      type: "page.observed",
      payload: observation,
      criterionIndex,
    });
  }

  async recordAssertionResult(
    result: AssertionResult,
    criterionIndex: number,
  ): Promise<void> {
    await this.#store.appendEvent({
      runId: this.#runId,
      timestamp: Date.now(),
      actor: "oracle",
      type: "assertion.checked",
      payload: result,
      criterionIndex,
    });
  }

  async recordCriterionResult(
    input: CriterionEvidenceInput,
  ): Promise<CriterionVerdict> {
    for (const observation of input.observations) {
      await this.recordPageObservation(
        observation,
        input.verdict.criterionIndex,
      );
    }

    for (const assertionResult of input.assertionResults) {
      await this.recordAssertionResult(
        assertionResult,
        input.verdict.criterionIndex,
      );
    }

    const artifactRefs = this.collectArtifactRefs();
    const verdict = finalizeCriterionVerdict(
      {
        criterionIndex: input.verdict.criterionIndex,
        sourceText: input.verdict.sourceText,
        assertionResults: [...input.assertionResults],
        artifactRefs,
      },
      input.verdict.verdict,
    );

    await this.#store.appendEvent({
      runId: this.#runId,
      timestamp: Date.now(),
      actor: "oracle",
      type: "criterion.completed",
      payload: {
        verdict: verdict.verdict,
        explanation: verdict.explanation,
      },
      criterionIndex: verdict.criterionIndex,
      artifactRefs: verdict.artifactRefs,
    });

    return verdict;
  }

  collectArtifactRefs(): string[] {
    const refs = new Set<string>();
    for (const paths of this.#store.getArtifactRefs().values()) {
      for (const path of paths) {
        refs.add(path);
      }
    }
    return [...refs];
  }

  matchResponseAssertion(assertion: {
    method: string;
    path: string;
    status: number;
  }) {
    return this.#store.matchResponseAssertion(assertion);
  }
}

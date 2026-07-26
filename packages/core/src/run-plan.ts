import { readinessFor, type Readiness, type Verdict } from "./contracts.ts";
import { finalizeCriterionVerdict } from "./oracle.ts";
import type { Criterion } from "./schemas/criterion.ts";
import type {
  CriterionVerdict,
  PrerequisiteFailure,
} from "./schemas/verdict.ts";

export interface CredentialAvailability {
  username: string | null;
  password: string | null;
}

export interface RunPlanContext {
  credentialAvailability?: CredentialAvailability;
}

export function findBlockingPrerequisite(
  criterion: Criterion,
  priorVerdicts: ReadonlyMap<number, CriterionVerdict>,
): PrerequisiteFailure | null {
  for (const prerequisiteIndex of criterion.prerequisites) {
    const prior = priorVerdicts.get(prerequisiteIndex);
    if (!prior) {
      return {
        index: prerequisiteIndex,
        reason: `Prerequisite ${prerequisiteIndex} was not evaluated before criterion ${criterion.index}.`,
      };
    }

    if (prior.verdict !== "PASS") {
      return {
        index: prerequisiteIndex,
        reason: `Prerequisite ${prerequisiteIndex} returned ${prior.verdict}: ${prior.explanation}`,
      };
    }
  }

  return null;
}

export function credentialPrerequisiteFailure(
  context: RunPlanContext,
): PrerequisiteFailure | null {
  const credentials = context.credentialAvailability;
  if (!credentials) {
    return null;
  }

  if (!credentials.username || !credentials.password) {
    return {
      index: 0,
      reason: "Login credentials are not configured for this run.",
    };
  }

  return null;
}

export function shouldSkipCriterion(
  criterion: Criterion,
  priorVerdicts: ReadonlyMap<number, CriterionVerdict>,
  context: RunPlanContext = {},
): PrerequisiteFailure | null {
  const credentialFailure = credentialPrerequisiteFailure(context);
  if (credentialFailure) {
    return credentialFailure;
  }

  return findBlockingPrerequisite(criterion, priorVerdicts);
}

export function buildSkippedCriterionVerdict(
  criterion: Criterion,
  prerequisiteFailure: PrerequisiteFailure,
): CriterionVerdict {
  return finalizeCriterionVerdict({
    criterionIndex: criterion.index,
    sourceText: criterion.sourceText,
    assertionResults: [],
    artifactRefs: [],
    prerequisiteFailure,
  });
}

export interface CriterionExecutorResult {
  verdict: CriterionVerdict;
}

export type CriterionExecutor = (
  criterion: Criterion,
) => Promise<CriterionExecutorResult>;

export interface ExecuteRunPlanOptions {
  criteria: readonly Criterion[];
  executeCriterion: CriterionExecutor;
  context?: RunPlanContext;
}

export interface ExecuteRunPlanResult {
  verdicts: CriterionVerdict[];
  readiness: Readiness;
}

/**
 * Runs criteria sequentially, skipping dependents when prerequisites fail.
 */
export async function executeRunPlan(
  options: ExecuteRunPlanOptions,
): Promise<ExecuteRunPlanResult> {
  const priorVerdicts = new Map<number, CriterionVerdict>();
  const verdicts: CriterionVerdict[] = [];

  for (const criterion of options.criteria) {
    const prerequisiteFailure = shouldSkipCriterion(
      criterion,
      priorVerdicts,
      options.context,
    );

    if (prerequisiteFailure) {
      const skipped = buildSkippedCriterionVerdict(
        criterion,
        prerequisiteFailure,
      );
      priorVerdicts.set(criterion.index, skipped);
      verdicts.push(skipped);
      continue;
    }

    const result = await options.executeCriterion(criterion);
    priorVerdicts.set(criterion.index, result.verdict);
    verdicts.push(result.verdict);
  }

  return {
    verdicts,
    readiness: aggregateRunReadiness(verdicts.map((entry) => entry.verdict)),
  };
}

export function aggregateRunReadiness(verdicts: readonly Verdict[]): Readiness {
  return readinessFor(verdicts);
}

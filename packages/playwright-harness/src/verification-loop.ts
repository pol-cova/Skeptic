import {
  browserActionSchema,
  checkLoopLimits,
  createCriterionLoopState,
  DEFAULT_CRITERION_LOOP_LIMITS,
  finalizeCriterionVerdict,
  finalizeExhaustedCriterion,
  type AssertionResult,
  type BrowserAction,
  type CriterionLoopLimits,
  type CriterionLoopState,
  type CriterionVerdict,
  type LoopLimitReason,
  type PageObservation,
  validateBrowserAction,
} from "@skeptic/core";

import { type ActionResult, PlaywrightHarness } from "./harness.ts";

export const CRITERION_1_TEXT =
  "An invalid email address shows a validation message and does not create an invitation.";

export const CRITERION_3_TEXT =
  "Inviting the same email twice shows a duplicate-invitation error and does not create a second row.";

export interface VerificationLoopOptions {
  criterionIndex: number;
  hypothesis: string;
  limits?: CriterionLoopLimits;
  startedAt?: number;
}

export interface VerificationLoopResult {
  verdict: CriterionVerdict;
  assertionResults: AssertionResult[];
  observations: PageObservation[];
  artifactRefs: string[];
  loopState: CriterionLoopState;
  limitReason?: LoopLimitReason;
}

export class VerificationLoopRunner {
  private readonly harness: PlaywrightHarness;
  private readonly limits: CriterionLoopLimits;
  private loopState: CriterionLoopState;
  private readonly assertionResults: AssertionResult[] = [];
  private readonly observations: PageObservation[] = [];
  private readonly artifactRefs: string[] = [];
  private limitReason?: LoopLimitReason;

  constructor(harness: PlaywrightHarness, options: VerificationLoopOptions) {
    this.harness = harness;
    this.limits = options.limits ?? DEFAULT_CRITERION_LOOP_LIMITS;
    this.loopState = createCriterionLoopState({
      criterionIndex: options.criterionIndex,
      hypothesis: options.hypothesis,
      startedAt: options.startedAt,
    });
  }

  get hypothesis(): string {
    return this.loopState.hypothesis;
  }

  get state(): CriterionLoopState {
    return this.loopState;
  }

  private ensureWithinLimits(): void {
    const status = checkLoopLimits(this.loopState, this.limits);
    if (status.exhausted) {
      this.limitReason = status.reason;
      throw new LoopLimitReachedError(status.reason ?? "steps");
    }
  }

  private recordStep(): void {
    this.loopState = {
      ...this.loopState,
      stepCount: this.loopState.stepCount + 1,
    };
    this.ensureWithinLimits();
  }

  async observe(): Promise<PageObservation> {
    this.recordStep();
    const observation = await this.harness.observe();
    this.observations.push(observation);
    return observation;
  }

  async act(action: BrowserAction): Promise<ActionResult> {
    this.ensureWithinLimits();

    const validation = validateBrowserAction(action);
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          code: "INVALID_ACTION",
          message: validation.error,
        },
        observation: await this.harness.observe(),
      };
    }

    this.recordStep();
    const result = await this.harness.execute(validation.action);
    this.observations.push(result.observation);

    if (result.assertionResult) {
      this.assertionResults.push(result.assertionResult);
    }

    return result;
  }

  async actWithRecovery(
    primary: BrowserAction,
    fallback: BrowserAction,
  ): Promise<ActionResult> {
    const first = await this.act(primary);
    if (first.ok) {
      return first;
    }

    return await this.act(fallback);
  }

  addArtifactRef(ref: string): void {
    if (ref.trim().length > 0) {
      this.artifactRefs.push(ref);
    }
  }

  finalize(sourceText: string, proposedVerdict?: CriterionVerdict["verdict"]) {
    const oracleInput = {
      criterionIndex: this.loopState.criterionIndex,
      sourceText,
      assertionResults: this.assertionResults,
      artifactRefs: this.artifactRefs,
    };

    if (this.limitReason) {
      const verdict = finalizeExhaustedCriterion(oracleInput, this.limitReason);
      return {
        verdict,
        assertionResults: [...this.assertionResults],
        observations: [...this.observations],
        artifactRefs: [...this.artifactRefs],
        loopState: this.loopState,
        limitReason: this.limitReason,
      };
    }

    const verdict = finalizeCriterionVerdict(oracleInput, proposedVerdict);
    return {
      verdict,
      assertionResults: [...this.assertionResults],
      observations: [...this.observations],
      artifactRefs: [...this.artifactRefs],
      loopState: this.loopState,
    };
  }
}

export class LoopLimitReachedError extends Error {
  readonly reason: LoopLimitReason;

  constructor(reason: LoopLimitReason) {
    super(`Verification loop limit reached: ${reason}`);
    this.name = "LoopLimitReachedError";
    this.reason = reason;
  }
}

export interface CriterionPathOptions {
  baseUrl: string;
  username: string;
  password: string;
}

async function loginForCriterion(
  harness: PlaywrightHarness,
  options: CriterionPathOptions,
): Promise<void> {
  const actions: BrowserAction[] = [
    {
      actionId: "loop-login-goto",
      type: "goto",
      url: `${options.baseUrl}/login`,
    },
    {
      actionId: "loop-login-fill-username",
      type: "fill",
      target: { testId: "login-username" },
      value: options.username,
    },
    {
      actionId: "loop-login-fill-password",
      type: "fill",
      target: { testId: "login-password" },
      value: options.password,
    },
    {
      actionId: "loop-login-submit",
      type: "click",
      target: { testId: "login-submit" },
    },
    {
      actionId: "loop-login-wait-team",
      type: "waitFor",
      target: { testId: "invite-email" },
      timeoutMs: 10_000,
    },
  ];

  for (const action of actions) {
    const result = await harness.execute(action);
    if (!result.ok) {
      throw new Error(
        `Login action ${action.actionId} failed: ${result.error?.message ?? "unknown error"}`,
      );
    }
  }
}

export async function runCriterion1Loop(
  harness: PlaywrightHarness,
  options: CriterionPathOptions,
): Promise<VerificationLoopResult> {
  const loop = new VerificationLoopRunner(harness, {
    criterionIndex: 1,
    hypothesis:
      "Submitting user@invalid shows a validation message and leaves pending invitations empty.",
  });

  await loginForCriterion(harness, options);
  await loop.observe();

  await loop.act({
    actionId: "c1-fill-invalid-email",
    type: "fill",
    target: { testId: "invite-email" },
    value: "user@invalid",
  });

  await loop.act({
    actionId: "c1-submit-invite",
    type: "click",
    target: { testId: "invite-submit" },
  });

  await loop.actWithRecovery(
    {
      actionId: "c1-wait-validation-primary",
      type: "waitFor",
      target: { testId: "invite-validation-error" },
      timeoutMs: 5_000,
    },
    {
      actionId: "c1-wait-validation-fallback",
      type: "waitFor",
      target: { role: "alert" },
      timeoutMs: 5_000,
    },
  );

  await loop.act({
    actionId: "c1-assert-visible",
    type: "assert",
    assertion: {
      type: "visible",
      target: { testId: "invite-validation-error" },
    },
  });

  await loop.act({
    actionId: "c1-assert-text",
    type: "assert",
    assertion: {
      type: "text",
      target: { testId: "invite-validation-error" },
      expected: "valid email",
    },
  });

  await loop.act({
    actionId: "c1-assert-count",
    type: "assert",
    assertion: {
      type: "count",
      target: { testId: "pending-invitation-row" },
      expected: 0,
    },
  });

  await loop.act({
    actionId: "c1-assert-response",
    type: "assert",
    assertion: {
      type: "response",
      method: "POST",
      path: "/api/invitations",
      status: 400,
    },
  });

  loop.addArtifactRef("screenshots/000001-1.png");
  await harness.page.screenshot({ fullPage: true });

  return loop.finalize(CRITERION_1_TEXT);
}

export async function runCriterion3Loop(
  harness: PlaywrightHarness,
  options: CriterionPathOptions & { inviteEmail: string },
): Promise<VerificationLoopResult> {
  const loop = new VerificationLoopRunner(harness, {
    criterionIndex: 3,
    hypothesis:
      "Submitting the same email twice shows invite-duplicate-error and keeps one pending row.",
  });

  await loginForCriterion(harness, options);
  await loop.observe();

  const resetResponse = await harness.page.request.post(
    `${options.baseUrl}/api/reset`,
  );
  if (!resetResponse.ok()) {
    throw new Error(
      `Failed to reset invitations: HTTP ${resetResponse.status()}`,
    );
  }

  for (const suffix of ["first", "second"] as const) {
    await loop.act({
      actionId: `c3-fill-${suffix}`,
      type: "fill",
      target: { testId: "invite-email" },
      value: options.inviteEmail,
    });

    await loop.act({
      actionId: `c3-submit-${suffix}`,
      type: "click",
      target: { testId: "invite-submit" },
    });
  }

  await loop.act({
    actionId: "c3-wait-duplicate",
    type: "waitFor",
    target: { testId: "invite-duplicate-error" },
    timeoutMs: 5_000,
  });

  await loop.act({
    actionId: "c3-assert-duplicate-visible",
    type: "assert",
    assertion: {
      type: "visible",
      target: { testId: "invite-duplicate-error" },
    },
  });

  await loop.act({
    actionId: "c3-assert-count",
    type: "assert",
    assertion: {
      type: "count",
      target: { testId: "pending-invitation-row" },
      expected: 1,
    },
  });

  loop.addArtifactRef("screenshots/000001-3.png");
  await harness.page.screenshot({ fullPage: true });

  return loop.finalize(CRITERION_3_TEXT);
}

export async function runCriterion1WithHarness(
  options: CriterionPathOptions,
): Promise<VerificationLoopResult> {
  const harness = new PlaywrightHarness({
    allowedOrigins: [options.baseUrl],
    headless: true,
  });

  await harness.launch();

  try {
    return await runCriterion1Loop(harness, options);
  } finally {
    await harness.close();
  }
}

export async function runCriterion3WithHarness(
  options: CriterionPathOptions & { inviteEmail: string },
): Promise<VerificationLoopResult> {
  const harness = new PlaywrightHarness({
    allowedOrigins: [options.baseUrl],
    headless: true,
  });

  await harness.launch();

  try {
    return await runCriterion3Loop(harness, options);
  } finally {
    await harness.close();
  }
}

export function isValidBrowserAction(input: unknown): input is BrowserAction {
  return browserActionSchema.safeParse(input).success;
}

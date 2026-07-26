import {
  deriveVerdict,
  type AssertionResult,
  type CriterionVerdict,
  type PageObservation,
  type Verdict,
} from "@skeptic/core";

import { PlaywrightHarness } from "./harness.ts";

export const CRITERION_2_TEXT =
  "A valid email address creates an invitation and displays it in the Pending invitations list.";

export interface Day1GateOptions {
  baseUrl: string;
  allowedOrigins: readonly string[];
  username: string;
  password: string;
  headless?: boolean;
  /** Unique email for the invite under test */
  inviteEmail?: string;
  /** Wait for a persisted row to appear after reload before asserting count */
  requirePersistedRow?: boolean;
}

export interface Day1GateScreenshots {
  afterSubmit: Buffer;
  afterReload: Buffer;
}

export interface Day1GateResult {
  verdict: CriterionVerdict;
  assertionResults: AssertionResult[];
  observations: PageObservation[];
  artifactRefs: string[];
  screenshots: Day1GateScreenshots;
}

async function login(
  harness: PlaywrightHarness,
  options: Day1GateOptions,
): Promise<void> {
  const actions = [
    {
      actionId: "gate-login-goto",
      type: "goto" as const,
      url: `${options.baseUrl}/login`,
    },
    {
      actionId: "gate-login-fill-username",
      type: "fill" as const,
      target: { testId: "login-username" },
      value: options.username,
    },
    {
      actionId: "gate-login-fill-password",
      type: "fill" as const,
      target: { testId: "login-password" },
      value: options.password,
    },
    {
      actionId: "gate-login-submit",
      type: "click" as const,
      target: { testId: "login-submit" },
    },
    {
      actionId: "gate-login-wait-team",
      type: "waitFor" as const,
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

function collectAssertion(
  results: AssertionResult[],
  execution: Awaited<ReturnType<PlaywrightHarness["execute"]>>,
): void {
  if (execution.assertionResult) {
    results.push(execution.assertionResult);
  }
}

/**
 * Hand-authored criterion 2 path through the typed Playwright harness.
 * No LLM involvement — deterministic assertions drive the oracle verdict.
 */
export async function runDay1Gate(
  harness: PlaywrightHarness,
  options: Day1GateOptions,
): Promise<Day1GateResult> {
  const inviteEmail = options.inviteEmail ?? `gate-${Date.now()}@example.com`;
  const assertionResults: AssertionResult[] = [];
  const observations: PageObservation[] = [];
  const artifactRefs: string[] = [];

  await login(harness, options);

  const resetResponse = await harness.page.request.post(
    `${options.baseUrl}/api/reset`,
  );
  if (!resetResponse.ok()) {
    throw new Error(
      `Failed to reset invitations: HTTP ${resetResponse.status()}`,
    );
  }

  const fillEmail = await harness.execute({
    actionId: "gate-invite-fill",
    type: "fill",
    target: { testId: "invite-email" },
    value: inviteEmail,
  });
  if (!fillEmail.ok) {
    throw new Error(
      `Invite fill failed: ${fillEmail.error?.message ?? "unknown error"}`,
    );
  }
  observations.push(fillEmail.observation);

  const submitInvite = await harness.execute({
    actionId: "gate-invite-submit",
    type: "click",
    target: { testId: "invite-submit" },
  });
  if (!submitInvite.ok) {
    throw new Error(
      `Invite submit failed: ${submitInvite.error?.message ?? "unknown error"}`,
    );
  }
  observations.push(submitInvite.observation);

  const waitForToast = await harness.execute({
    actionId: "gate-invite-wait-toast",
    type: "waitFor",
    target: { testId: "invite-success-toast" },
    timeoutMs: 5_000,
  });
  if (!waitForToast.ok) {
    throw new Error(
      `Success toast wait failed: ${waitForToast.error?.message ?? "unknown error"}`,
    );
  }
  observations.push(waitForToast.observation);

  const toastAssert = await harness.execute({
    actionId: "gate-invite-assert-toast",
    type: "assert",
    assertion: {
      type: "visible",
      target: { testId: "invite-success-toast" },
    },
  });
  collectAssertion(assertionResults, toastAssert);
  observations.push(toastAssert.observation);

  const responseAssert = await harness.execute({
    actionId: "gate-invite-assert-response",
    type: "assert",
    assertion: {
      type: "response",
      method: "POST",
      path: "/api/invitations",
      status: 200,
    },
  });
  collectAssertion(assertionResults, responseAssert);
  observations.push(responseAssert.observation);

  const optimisticCount = await harness.execute({
    actionId: "gate-invite-assert-optimistic-count",
    type: "assert",
    assertion: {
      type: "count",
      target: { testId: "pending-invitation-row" },
      expected: 1,
    },
  });
  collectAssertion(assertionResults, optimisticCount);
  observations.push(optimisticCount.observation);

  const screenshotAfterSubmit = await harness.page.screenshot({
    fullPage: true,
  });
  artifactRefs.push("screenshots/000001-2.png");

  const reload = await harness.execute({
    actionId: "gate-invite-reload",
    type: "goto",
    url: `${options.baseUrl}/team`,
  });
  if (!reload.ok) {
    throw new Error(
      `Reload failed: ${reload.error?.message ?? "unknown error"}`,
    );
  }
  observations.push(reload.observation);

  const waitForList = await harness.execute({
    actionId: "gate-invite-wait-list",
    type: "waitFor",
    target: { testId: "pending-invitations" },
    timeoutMs: 5_000,
  });
  if (!waitForList.ok) {
    throw new Error(
      `Pending list wait failed: ${waitForList.error?.message ?? "unknown error"}`,
    );
  }
  observations.push(waitForList.observation);

  if (options.requirePersistedRow) {
    const waitForRow = await harness.execute({
      actionId: "gate-invite-wait-persisted-row",
      type: "waitFor",
      target: { testId: "pending-invitations" },
      timeoutMs: 10_000,
    });
    if (!waitForRow.ok) {
      throw new Error(
        `Persisted list wait failed: ${waitForRow.error?.message ?? "unknown error"}`,
      );
    }
    observations.push(waitForRow.observation);
  }

  const persistedCount = await harness.execute({
    actionId: "gate-invite-assert-persisted-count",
    type: "assert",
    assertion: {
      type: "count",
      target: { testId: "pending-invitation-row" },
      expected: 1,
    },
  });
  collectAssertion(assertionResults, persistedCount);
  observations.push(persistedCount.observation);

  const screenshotAfterReload = await harness.page.screenshot({
    fullPage: true,
  });
  artifactRefs.push("screenshots/000002-2.png");

  const verdict = deriveVerdict({
    criterionIndex: 2,
    sourceText: CRITERION_2_TEXT,
    assertionResults,
    artifactRefs,
  });

  return {
    verdict: {
      criterionIndex: 2,
      sourceText: CRITERION_2_TEXT,
      verdict: verdict.verdict,
      explanation: verdict.explanation,
      assertionResults: verdict.assertionResults,
      artifactRefs: verdict.artifactRefs,
    },
    assertionResults,
    observations,
    artifactRefs,
    screenshots: {
      afterSubmit: screenshotAfterSubmit,
      afterReload: screenshotAfterReload,
    },
  };
}

export async function runDay1GateWithHarness(
  options: Day1GateOptions,
): Promise<Day1GateResult> {
  const harness = new PlaywrightHarness({
    allowedOrigins: [...options.allowedOrigins],
    headless: options.headless ?? true,
  });

  await harness.launch();

  try {
    return await runDay1Gate(harness, options);
  } finally {
    await harness.close();
  }
}

export function expectedVerdictForPersistenceMode(
  persistenceFixed: boolean,
): Verdict {
  return persistenceFixed ? "PASS" : "FAIL";
}

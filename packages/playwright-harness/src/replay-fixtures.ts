import type { BrowserAction, ReplayFixture } from "@skeptic/core";

import { CRITERION_1_TEXT, CRITERION_3_TEXT } from "./verification-loop.ts";
import { CRITERION_2_TEXT } from "./day1-gate.ts";

export const REPLAY_INVITE_EMAIL_VAR = "INVITE_EMAIL";

export function buildLoginSteps(
  baseUrl: string,
  username: string,
  password: string,
  loginPath = "/login",
): BrowserAction[] {
  return [
    {
      actionId: "replay-login-goto",
      type: "goto",
      url: `${baseUrl}${loginPath}`,
    },
    {
      actionId: "replay-login-fill-username",
      type: "fill",
      target: { testId: "login-username" },
      value: username,
    },
    {
      actionId: "replay-login-fill-password",
      type: "fill",
      target: { testId: "login-password" },
      value: password,
    },
    {
      actionId: "replay-login-submit",
      type: "click",
      target: { testId: "login-submit" },
    },
    {
      actionId: "replay-login-wait-team",
      type: "waitFor",
      target: { testId: "invite-email" },
      timeoutMs: 10_000,
    },
  ];
}

export function buildCriterion1Steps(): BrowserAction[] {
  return [
    {
      actionId: "c1-fill-invalid-email",
      type: "fill",
      target: { testId: "invite-email" },
      value: "user@invalid",
    },
    {
      actionId: "c1-submit-invite",
      type: "click",
      target: { testId: "invite-submit" },
    },
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
    {
      actionId: "c1-assert-visible",
      type: "assert",
      assertion: {
        type: "visible",
        target: { testId: "invite-validation-error" },
      },
    },
    {
      actionId: "c1-assert-text",
      type: "assert",
      assertion: {
        type: "text",
        target: { testId: "invite-validation-error" },
        expected: "valid email",
      },
    },
    {
      actionId: "c1-assert-count",
      type: "assert",
      assertion: {
        type: "count",
        target: { testId: "pending-invitation-row" },
        expected: 0,
      },
    },
    {
      actionId: "c1-assert-response",
      type: "assert",
      assertion: {
        type: "response",
        method: "POST",
        path: "/api/invitations",
        status: 400,
      },
    },
  ];
}

export function buildCriterion2Steps(
  baseUrl: string,
  inviteEmail: string,
): BrowserAction[] {
  return [
    {
      actionId: "c2-fill-email",
      type: "fill",
      target: { testId: "invite-email" },
      value: inviteEmail,
    },
    {
      actionId: "c2-submit-invite",
      type: "click",
      target: { testId: "invite-submit" },
    },
    {
      actionId: "c2-wait-toast",
      type: "waitFor",
      target: { testId: "invite-success-toast" },
      timeoutMs: 5_000,
    },
    {
      actionId: "c2-assert-toast",
      type: "assert",
      assertion: {
        type: "visible",
        target: { testId: "invite-success-toast" },
      },
    },
    {
      actionId: "c2-assert-response",
      type: "assert",
      assertion: {
        type: "response",
        method: "POST",
        path: "/api/invitations",
        status: 200,
      },
    },
    {
      actionId: "c2-assert-optimistic-count",
      type: "assert",
      assertion: {
        type: "count",
        target: { testId: "pending-invitation-row" },
        expected: 1,
      },
    },
    {
      actionId: "c2-reload",
      type: "goto",
      url: `${baseUrl}/team`,
    },
    {
      actionId: "c2-wait-list",
      type: "waitFor",
      target: { testId: "pending-invitations" },
      timeoutMs: 5_000,
    },
    {
      actionId: "c2-assert-persisted-count",
      type: "assert",
      assertion: {
        type: "count",
        target: { testId: "pending-invitation-row" },
        expected: 1,
      },
    },
  ];
}

export function buildCriterion3Steps(inviteEmail: string): BrowserAction[] {
  return [
    {
      actionId: "c3-fill-first",
      type: "fill",
      target: { testId: "invite-email" },
      value: inviteEmail,
    },
    {
      actionId: "c3-submit-first",
      type: "click",
      target: { testId: "invite-submit" },
    },
    {
      actionId: "c3-fill-second",
      type: "fill",
      target: { testId: "invite-email" },
      value: inviteEmail,
    },
    {
      actionId: "c3-submit-second",
      type: "click",
      target: { testId: "invite-submit" },
    },
    {
      actionId: "c3-wait-duplicate",
      type: "waitFor",
      target: { testId: "invite-duplicate-error" },
      timeoutMs: 5_000,
    },
    {
      actionId: "c3-assert-duplicate-visible",
      type: "assert",
      assertion: {
        type: "visible",
        target: { testId: "invite-duplicate-error" },
      },
    },
    {
      actionId: "c3-assert-count",
      type: "assert",
      assertion: {
        type: "count",
        target: { testId: "pending-invitation-row" },
        expected: 1,
      },
    },
  ];
}

export interface DemoReplayFixtureOptions {
  baseUrl: string;
  allowedOrigins: readonly string[];
  username: string;
  password: string;
  inviteEmail?: string;
  loginPath?: string;
}

/**
 * Builds a deterministic replay fixture for the demo app's three criteria.
 */
export function buildDemoReplayFixture(
  options: DemoReplayFixtureOptions,
): ReplayFixture {
  const inviteEmail = options.inviteEmail ?? `replay-${Date.now()}@example.com`;
  const loginSteps = buildLoginSteps(
    options.baseUrl,
    options.username,
    options.password,
    options.loginPath ?? "/login",
  );

  return {
    version: 1,
    baseUrl: options.baseUrl,
    allowedOrigins: [...options.allowedOrigins],
    variables: {
      [REPLAY_INVITE_EMAIL_VAR]: inviteEmail,
    },
    generatedAt: Date.now(),
    criteria: [
      {
        criterionIndex: 1,
        sourceText: CRITERION_1_TEXT,
        beforeSteps: [{ type: "api", method: "POST", path: "/api/reset" }],
        steps: [...loginSteps, ...buildCriterion1Steps()],
      },
      {
        criterionIndex: 2,
        sourceText: CRITERION_2_TEXT,
        beforeSteps: [{ type: "api", method: "POST", path: "/api/reset" }],
        steps: [
          ...loginSteps,
          ...buildCriterion2Steps(options.baseUrl, inviteEmail),
        ],
      },
      {
        criterionIndex: 3,
        sourceText: CRITERION_3_TEXT,
        beforeSteps: [{ type: "api", method: "POST", path: "/api/reset" }],
        steps: [...loginSteps, ...buildCriterion3Steps(inviteEmail)],
      },
    ],
  };
}

import {
  checkReadiness,
  startOrReuseApp,
  stopApp,
  type StartAppResult,
} from "@skeptic/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PlaywrightHarness } from "./harness.ts";

const BASE_URL = "http://127.0.0.1:3100";
const ALLOWED_ORIGINS = [BASE_URL];
const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

let appStartup: StartAppResult | null = null;

async function ensureDemoAppReady(): Promise<void> {
  if (await checkReadiness(`${BASE_URL}/health`)) {
    return;
  }

  appStartup = await startOrReuseApp({
    baseUrl: BASE_URL,
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
  });
}

async function login(harness: PlaywrightHarness): Promise<void> {
  const goto = await harness.execute({
    actionId: "login-goto",
    type: "goto",
    url: `${BASE_URL}/login`,
  });
  expect(goto.ok).toBe(true);

  const username = await harness.execute({
    actionId: "login-fill-username",
    type: "fill",
    target: { testId: "login-username" },
    value: DEMO_USERNAME,
  });
  expect(username.ok).toBe(true);

  const password = await harness.execute({
    actionId: "login-fill-password",
    type: "fill",
    target: { testId: "login-password" },
    value: DEMO_PASSWORD,
  });
  expect(password.ok).toBe(true);

  const submit = await harness.execute({
    actionId: "login-click-submit",
    type: "click",
    target: { testId: "login-submit" },
  });
  expect(submit.ok).toBe(true);

  const waitForTeam = await harness.execute({
    actionId: "login-wait-team",
    type: "waitFor",
    target: { testId: "invite-email" },
    timeoutMs: 10_000,
  });
  expect(waitForTeam.ok).toBe(true);
}

describe("PlaywrightHarness demo integration", () => {
  beforeAll(async () => {
    await ensureDemoAppReady();
  }, 120_000);

  afterAll(async () => {
    await stopApp(appStartup?.process ?? null);
  });

  it("operates the demo app through typed actions", async () => {
    const harness = new PlaywrightHarness({
      allowedOrigins: ALLOWED_ORIGINS,
      headless: true,
    });

    await harness.launch();

    try {
      await login(harness);

      const urlAssert = await harness.execute({
        actionId: "assert-team-url",
        type: "assert",
        assertion: {
          type: "url",
          expected: `${BASE_URL}/team`,
        },
      });
      expect(urlAssert.ok).toBe(true);

      const fillInvalidEmail = await harness.execute({
        actionId: "invite-fill-invalid",
        type: "fill",
        target: { testId: "invite-email" },
        value: "user@invalid",
      });
      expect(fillInvalidEmail.ok).toBe(true);

      const submitInvite = await harness.execute({
        actionId: "invite-click-submit",
        type: "click",
        target: { testId: "invite-submit" },
      });
      expect(submitInvite.ok).toBe(true);

      const waitForValidation = await harness.execute({
        actionId: "invite-wait-validation",
        type: "waitFor",
        target: { testId: "invite-validation-error" },
        timeoutMs: 5_000,
      });
      expect(waitForValidation.ok).toBe(true);

      const visibleAssert = await harness.execute({
        actionId: "invite-assert-visible",
        type: "assert",
        assertion: {
          type: "visible",
          target: { testId: "invite-validation-error" },
        },
      });
      expect(visibleAssert.ok).toBe(true);

      const textAssert = await harness.execute({
        actionId: "invite-assert-text",
        type: "assert",
        assertion: {
          type: "text",
          target: { testId: "invite-validation-error" },
          expected: "valid email",
        },
      });
      expect(textAssert.ok).toBe(true);

      const hiddenAssert = await harness.execute({
        actionId: "invite-assert-hidden",
        type: "assert",
        assertion: {
          type: "hidden",
          target: { testId: "invite-duplicate-error" },
        },
      });
      expect(hiddenAssert.ok).toBe(true);

      const countAssert = await harness.execute({
        actionId: "invite-assert-count",
        type: "assert",
        assertion: {
          type: "count",
          target: { testId: "pending-invitation-row" },
          expected: 0,
        },
      });
      expect(countAssert.ok).toBe(true);

      const responseAssert = await harness.execute({
        actionId: "invite-assert-response",
        type: "assert",
        assertion: {
          type: "response",
          method: "POST",
          path: "/api/invitations",
          status: 400,
        },
      });
      expect(responseAssert.ok).toBe(true);

      const pressAction = await harness.execute({
        actionId: "invite-press-enter",
        type: "press",
        key: "Enter",
        target: { testId: "invite-email" },
      });
      expect(pressAction.ok).toBe(true);

      await harness.page.setContent(
        `<label for="role-select">Role</label><select id="role-select" data-testid="role-select"><option value="admin">Admin</option><option value="member" selected>Member</option></select>`,
      );

      const selectAction = await harness.execute({
        actionId: "fixture-select",
        type: "select",
        target: { testId: "role-select" },
        value: "admin",
      });
      expect(selectAction.ok).toBe(true);

      const observation = await harness.observe();
      expect(observation.url.startsWith(BASE_URL)).toBe(true);
      expect(observation.elements.length).toBeGreaterThan(0);
    } finally {
      await harness.close();
    }
  }, 60_000);

  it("does not leak cookies or storage between runs", async () => {
    const first = new PlaywrightHarness({
      allowedOrigins: ALLOWED_ORIGINS,
      headless: true,
    });
    await first.launch();

    try {
      await login(first);
      expect(first.page.url()).toContain("/team");
    } finally {
      await first.close();
    }

    const second = new PlaywrightHarness({
      allowedOrigins: ALLOWED_ORIGINS,
      headless: true,
    });
    await second.launch();

    try {
      const gotoTeam = await second.execute({
        actionId: "second-goto-team",
        type: "goto",
        url: `${BASE_URL}/team`,
      });
      expect(gotoTeam.ok).toBe(true);

      const waitForLogin = await second.execute({
        actionId: "second-wait-login",
        type: "waitFor",
        target: { testId: "login-username" },
        timeoutMs: 10_000,
      });
      expect(waitForLogin.ok).toBe(true);

      const redirected = await second.execute({
        actionId: "second-assert-login-visible",
        type: "assert",
        assertion: {
          type: "visible",
          target: { testId: "login-username" },
        },
      });
      expect(redirected.ok).toBe(true);
    } finally {
      await second.close();
    }
  }, 60_000);
});

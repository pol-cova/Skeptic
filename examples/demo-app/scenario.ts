import type { ScenarioBuildContext } from "@skeptic/core";
import { buildDemoReplayFixture } from "@skeptic/playwright-harness";

export function buildScenario(context: ScenarioBuildContext) {
  const inviteEmail =
    context.variables?.INVITE_EMAIL ?? `verify-${context.runId}@example.com`;

  return buildDemoReplayFixture({
    baseUrl: context.baseUrl,
    allowedOrigins: context.allowedOrigins,
    username: context.username,
    password: context.password,
    inviteEmail,
    loginPath: context.loginPath,
  });
}

export const PACKAGE_NAME = "@skeptic/playwright-harness";

export {
  PlaywrightHarness,
  assertAllowedUrl,
  harnessError,
  isAllowedUrl,
  resolveLocator,
  type ActionResult,
  type HarnessError,
  type HarnessErrorCode,
  type HarnessOptions,
} from "./harness.ts";

export {
  CRITERION_2_TEXT,
  expectedVerdictForPersistenceMode,
  runDay1Gate,
  runDay1GateWithHarness,
  type Day1GateOptions,
  type Day1GateResult,
  type Day1GateScreenshots,
} from "./day1-gate.ts";

export {
  CRITERION_1_TEXT,
  CRITERION_3_TEXT,
  isValidBrowserAction,
  LoopLimitReachedError,
  runCriterion1Loop,
  runCriterion1WithHarness,
  runCriterion3Loop,
  runCriterion3WithHarness,
  VerificationLoopRunner,
  type CriterionPathOptions,
  type VerificationLoopOptions,
  type VerificationLoopResult,
} from "./verification-loop.ts";

export { captureObservation, collectAccessibleElements } from "./observe.ts";
export {
  executeBrowserAction,
  type ActionExecutionContext,
  type ActionExecutionResult,
} from "./actions.ts";
export { runAssertion } from "./assertions.ts";
export { NetworkLog, type NetworkObservationHandler } from "./network-log.ts";

export {
  createHarnessEvidenceProviders,
  HarnessEvidenceBridge,
  type CriterionEvidenceInput,
} from "./evidence-bridge.ts";

export { executeScenarioCriterion } from "./scenario-verify.ts";

export {
  buildAgentSystemPrompt,
  executeAgentCriterion,
  type AgentCriterionOptions,
} from "./agent-verify.ts";

export {
  buildCriterion2Steps,
  buildCriterion3Steps,
  buildDemoReplayFixture,
  buildLoginSteps,
  REPLAY_INVITE_EMAIL_VAR,
  type DemoReplayFixtureOptions,
} from "./replay-fixtures.ts";

export {
  replayCriterionSteps,
  replayFixture,
  replayFixtureFromFile,
  type ReplayCriterionResult,
  type ReplayRunOptions,
  type ReplayRunResult,
} from "./replay-runner.ts";

export {
  generatePlaywrightSpec,
  generatePlaywrightSpecFromFixture,
} from "./playwright-codegen.ts";

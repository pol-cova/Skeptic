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

export { captureObservation, collectAccessibleElements } from "./observe.ts";
export {
  executeBrowserAction,
  type ActionExecutionContext,
  type ActionExecutionResult,
} from "./actions.ts";
export { runAssertion } from "./assertions.ts";
export { NetworkLog } from "./network-log.ts";

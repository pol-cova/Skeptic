import type { AssertionResult, BrowserAction } from "@skeptic/core";
import type { Page } from "playwright";

import { runAssertion } from "./assertions.ts";
import { resolveLocator } from "./locator.ts";
import type { NetworkLog } from "./network-log.ts";
import { assertAllowedUrl } from "./origin.ts";
import { harnessError, type HarnessError } from "./errors.ts";

export interface ActionExecutionContext {
  page: Page;
  allowedOrigins: readonly string[];
  networkLog: NetworkLog;
  defaultTimeoutMs: number;
}

export interface ActionExecutionResult {
  error?: HarnessError;
  assertionResult?: AssertionResult;
}

export async function executeBrowserAction(
  ctx: ActionExecutionContext,
  action: BrowserAction,
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "goto": {
      const violation = assertAllowedUrl(action.url, ctx.allowedOrigins);
      if (violation) {
        return { error: violation };
      }

      await ctx.page.goto(action.url, { timeout: ctx.defaultTimeoutMs });
      return {};
    }

    case "click": {
      const locator = resolveLocator(ctx.page, action.target);
      await locator.click({ timeout: ctx.defaultTimeoutMs });
      return {};
    }

    case "fill": {
      const locator = resolveLocator(ctx.page, action.target);
      await locator.fill(action.value, { timeout: ctx.defaultTimeoutMs });
      return {};
    }

    case "select": {
      const locator = resolveLocator(ctx.page, action.target);
      await locator.selectOption(action.value, {
        timeout: ctx.defaultTimeoutMs,
      });
      return {};
    }

    case "press": {
      if (action.target !== undefined) {
        const locator = resolveLocator(ctx.page, action.target);
        await locator.press(action.key, { timeout: ctx.defaultTimeoutMs });
      } else {
        await ctx.page.keyboard.press(action.key);
      }

      return {};
    }

    case "waitFor": {
      const timeoutMs = action.timeoutMs ?? ctx.defaultTimeoutMs;

      if (action.target !== undefined) {
        const locator = resolveLocator(ctx.page, action.target);
        await locator.waitFor({ state: "visible", timeout: timeoutMs });
      } else {
        await ctx.page.waitForTimeout(timeoutMs);
      }

      return {};
    }

    case "assert": {
      const assertionResult = await runAssertion(
        ctx.page,
        action.assertion,
        ctx.networkLog,
      );

      if (!assertionResult.passed) {
        return {
          error: harnessError(
            "ASSERTION_FAILED",
            `Assertion ${action.assertion.type} failed.`,
          ),
          assertionResult,
        };
      }

      return { assertionResult };
    }

    default: {
      const unreachable: never = action;
      return {
        error: harnessError(
          "INVALID_ACTION",
          `Unsupported action type: ${String(unreachable)}`,
        ),
      };
    }
  }
}

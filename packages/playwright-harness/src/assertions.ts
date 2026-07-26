import type { Assertion, AssertionResult } from "@skeptic/core";
import type { Page } from "playwright";

import { resolveLocator } from "./locator.ts";
import type { NetworkLog } from "./network-log.ts";

export async function runAssertion(
  page: Page,
  assertion: Assertion,
  networkLog: NetworkLog,
): Promise<AssertionResult> {
  const timestamp = Date.now();

  switch (assertion.type) {
    case "visible": {
      const locator = resolveLocator(page, assertion.target);
      const passed = await locator.isVisible();
      return {
        assertion,
        passed,
        expected: true,
        observed: passed,
        timestamp,
      };
    }

    case "hidden": {
      const locator = resolveLocator(page, assertion.target);
      const passed = !(await locator.isVisible().catch(() => false));
      return {
        assertion,
        passed,
        expected: false,
        observed: !passed,
        timestamp,
      };
    }

    case "text": {
      const locator = resolveLocator(page, assertion.target);
      const observed = (await locator.textContent())?.trim() ?? "";
      const passed = observed.includes(assertion.expected);
      return {
        assertion,
        passed,
        expected: assertion.expected,
        observed,
        timestamp,
      };
    }

    case "count": {
      const locator = resolveLocator(page, assertion.target);
      const observed = await locator.count();
      const passed = observed === assertion.expected;
      return {
        assertion,
        passed,
        expected: assertion.expected,
        observed,
        timestamp,
      };
    }

    case "url": {
      const observed = page.url();
      const passed = observed === assertion.expected;
      return {
        assertion,
        passed,
        expected: assertion.expected,
        observed,
        timestamp,
      };
    }

    case "response": {
      const match = networkLog
        .snapshot()
        .reverse()
        .find(
          (entry) =>
            entry.method.toUpperCase() === assertion.method.toUpperCase() &&
            entry.path === assertion.path &&
            entry.status === assertion.status,
        );
      const passed = match !== undefined;
      return {
        assertion,
        passed,
        expected: {
          method: assertion.method,
          path: assertion.path,
          status: assertion.status,
        },
        observed: match ?? null,
        timestamp,
      };
    }

    default: {
      const unreachable: never = assertion;
      throw new Error(`Unsupported assertion type: ${String(unreachable)}`);
    }
  }
}

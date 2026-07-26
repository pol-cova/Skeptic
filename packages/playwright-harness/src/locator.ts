import type { ElementTarget } from "@skeptic/core";
import type { Locator, Page } from "playwright";

const ARIA_ROLES = new Set([
  "alert",
  "button",
  "checkbox",
  "combobox",
  "heading",
  "link",
  "list",
  "listitem",
  "option",
  "status",
  "textbox",
]);

function isAriaRole(value: string): value is Parameters<Page["getByRole"]>[0] {
  return ARIA_ROLES.has(value);
}

export function resolveLocator(page: Page, target: ElementTarget): Locator {
  if (target.testId !== undefined) {
    return page.getByTestId(target.testId);
  }

  if (target.role !== undefined) {
    if (!isAriaRole(target.role)) {
      throw new Error(`Unsupported ARIA role: ${target.role}`);
    }

    return target.name !== undefined
      ? page.getByRole(target.role, { name: target.name })
      : page.getByRole(target.role);
  }

  if (target.label !== undefined) {
    return page.getByLabel(target.label);
  }

  if (target.placeholder !== undefined) {
    return page.getByPlaceholder(target.placeholder);
  }

  if (target.text !== undefined) {
    return page.getByText(target.text);
  }

  throw new Error("An element target requires at least one locator field.");
}

import type {
  AccessibleElement,
  NetworkObservation,
  PageObservation,
} from "@skeptic/core";
import type { Page } from "playwright";

const OBSERVED_ROLES = [
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
] as const;

const MAX_ELEMENTS = 40;

async function describeRoleElements(
  page: Page,
  role: (typeof OBSERVED_ROLES)[number],
): Promise<AccessibleElement[]> {
  const locator = page.getByRole(role);
  const count = await locator.count();
  const elements: AccessibleElement[] = [];

  for (
    let index = 0;
    index < count && elements.length < MAX_ELEMENTS;
    index += 1
  ) {
    const candidate = locator.nth(index);
    const testId = await candidate.getAttribute("data-testid");
    const value = await candidate
      .inputValue()
      .catch(async () => (await candidate.textContent())?.trim() ?? undefined);
    const checked = await candidate.isChecked().catch(() => undefined);
    const disabled = await candidate.isDisabled().catch(() => undefined);
    const name =
      (await candidate.getAttribute("aria-label")) ??
      (await candidate.textContent())?.trim().slice(0, 120) ??
      undefined;

    elements.push({
      role,
      ...(name ? { name } : {}),
      ...(testId ? { testId } : {}),
      ...(value ? { value } : {}),
      ...(checked !== undefined ? { checked } : {}),
      ...(disabled !== undefined ? { disabled } : {}),
    });
  }

  return elements;
}

export async function collectAccessibleElements(
  page: Page,
): Promise<AccessibleElement[]> {
  const elements: AccessibleElement[] = [];

  for (const role of OBSERVED_ROLES) {
    if (elements.length >= MAX_ELEMENTS) {
      break;
    }

    const roleElements = await describeRoleElements(page, role);
    elements.push(...roleElements.slice(0, MAX_ELEMENTS - elements.length));
  }

  return elements;
}

export async function captureObservation(
  page: Page,
  consoleErrors: readonly string[],
  networkLog: readonly NetworkObservation[],
): Promise<PageObservation> {
  return {
    url: page.url(),
    title: await page.title(),
    elements: await collectAccessibleElements(page),
    ...(consoleErrors.length > 0 ? { errors: [...consoleErrors] } : {}),
    ...(networkLog.length > 0 ? { network: [...networkLog] } : {}),
    capturedAt: Date.now(),
  };
}

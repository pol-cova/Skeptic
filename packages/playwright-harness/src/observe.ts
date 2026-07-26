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
const OBSERVATION_TIMEOUT_MS = 1_000;

async function readOptional<T>(operation: Promise<T>): Promise<T | undefined> {
  try {
    return await operation;
  } catch {
    return undefined;
  }
}

async function describeRoleElements(
  page: Page,
  role: (typeof OBSERVED_ROLES)[number],
): Promise<AccessibleElement[]> {
  const locator = page.getByRole(role);
  const count = (await readOptional(locator.count())) ?? 0;
  const elements: AccessibleElement[] = [];

  for (
    let index = 0;
    index < count && elements.length < MAX_ELEMENTS;
    index += 1
  ) {
    const candidate = locator.nth(index);
    const testId = await readOptional(
      candidate.getAttribute("data-testid", {
        timeout: OBSERVATION_TIMEOUT_MS,
      }),
    );
    const value = await readOptional(
      candidate.inputValue({ timeout: OBSERVATION_TIMEOUT_MS }),
    ).then(async (input) => {
      if (input !== undefined) {
        return input;
      }

      return readOptional(
        candidate.textContent({ timeout: OBSERVATION_TIMEOUT_MS }),
      ).then((text) => text?.trim());
    });
    const checked = await readOptional(
      candidate.isChecked({ timeout: OBSERVATION_TIMEOUT_MS }),
    );
    const disabled = await readOptional(
      candidate.isDisabled({ timeout: OBSERVATION_TIMEOUT_MS }),
    );
    const name =
      (await readOptional(
        candidate.getAttribute("aria-label", {
          timeout: OBSERVATION_TIMEOUT_MS,
        }),
      )) ??
      (
        await readOptional(
          candidate.textContent({ timeout: OBSERVATION_TIMEOUT_MS }),
        )
      )
        ?.trim()
        .slice(0, 120) ??
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

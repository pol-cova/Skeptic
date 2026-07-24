export const PLAYWRIGHT_HARNESS_PACKAGE =
  "@skeptic/playwright-harness" as const;

export function harnessPlaceholder(): string {
  return PLAYWRIGHT_HARNESS_PACKAGE;
}

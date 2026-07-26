import { harnessError, type HarnessError } from "./errors.ts";

export function normalizeOrigin(url: string): string {
  return new URL(url).origin;
}

export function isAllowedUrl(
  url: string,
  allowedOrigins: readonly string[],
): boolean {
  const origin = normalizeOrigin(url);
  return allowedOrigins.some((allowed) => normalizeOrigin(allowed) === origin);
}

export function originViolationError(
  url: string,
  allowedOrigins: readonly string[],
): HarnessError {
  return harnessError(
    "ORIGIN_VIOLATION",
    `URL "${url}" is outside allowed origins: ${allowedOrigins.join(", ")}`,
  );
}

export function assertAllowedUrl(
  url: string,
  allowedOrigins: readonly string[],
): HarnessError | undefined {
  if (!isAllowedUrl(url, allowedOrigins)) {
    return originViolationError(url, allowedOrigins);
  }

  return undefined;
}

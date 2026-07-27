export type HarnessErrorCode =
  | "INVALID_ACTION"
  | "ORIGIN_VIOLATION"
  | "ACTION_FAILED"
  | "ASSERTION_FAILED"
  | "BROWSER_CRASH";

export interface HarnessError {
  code: HarnessErrorCode;
  message: string;
}

export function harnessError(
  code: HarnessErrorCode,
  message: string,
): HarnessError {
  return { code, message };
}

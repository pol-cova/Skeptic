import { describe, expect, it } from "vitest";

import {
  criterionResultSchema,
  exitCodeFor,
  readinessFor,
} from "./contracts.ts";

describe("contracts", () => {
  it("follows the frozen readiness precedence", () => {
    expect(readinessFor(["PASS"])).toBe("READY");
    expect(readinessFor(["PASS", "FAIL"])).toBe("NOT_READY");
    expect(readinessFor(["FAIL", "UNVERIFIABLE"])).toBe("INCOMPLETE");
    expect(readinessFor(["UNVERIFIABLE", "HARNESS_ERROR"])).toBe("ERROR");
  });

  it("maps each readiness value to its frozen exit code", () => {
    expect(exitCodeFor("READY")).toBe(0);
    expect(exitCodeFor("NOT_READY")).toBe(1);
    expect(exitCodeFor("INCOMPLETE")).toBe(2);
    expect(exitCodeFor("ERROR")).toBe(3);
  });

  it("rejects criterion result vocabulary aliases", () => {
    const result = criterionResultSchema.safeParse({
      criterion: "The invitation persists after reload.",
      verdict: "PROVEN",
      explanation: "Legacy vocabulary must not be accepted.",
    });

    expect(result.success).toBe(false);
  });
});

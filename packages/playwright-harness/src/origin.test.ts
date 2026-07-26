import { describe, expect, it } from "vitest";

import {
  assertAllowedUrl,
  isAllowedUrl,
  normalizeOrigin,
  originViolationError,
} from "./origin.ts";

describe("origin allowlist", () => {
  const allowed = ["http://127.0.0.1:3100"];

  it("normalizes origins", () => {
    expect(normalizeOrigin("http://127.0.0.1:3100/login")).toBe(
      "http://127.0.0.1:3100",
    );
  });

  it("allows same-origin paths", () => {
    expect(isAllowedUrl("http://127.0.0.1:3100/team", allowed)).toBe(true);
  });

  it("rejects off-origin navigation targets", () => {
    expect(isAllowedUrl("https://example.com", allowed)).toBe(false);
    expect(assertAllowedUrl("https://example.com", allowed)).toEqual(
      originViolationError("https://example.com", allowed),
    );
  });
});

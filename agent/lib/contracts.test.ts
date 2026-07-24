import assert from "node:assert/strict";
import test from "node:test";

import {
  criterionResultSchema,
  exitCodeFor,
  readinessFor,
} from "./contracts.ts";

test("readiness follows the frozen precedence", () => {
  assert.equal(readinessFor(["PASS"]), "READY");
  assert.equal(readinessFor(["PASS", "FAIL"]), "NOT_READY");
  assert.equal(readinessFor(["FAIL", "UNVERIFIABLE"]), "INCOMPLETE");
  assert.equal(readinessFor(["UNVERIFIABLE", "HARNESS_ERROR"]), "ERROR");
});

test("each readiness value maps to its frozen exit code", () => {
  assert.equal(exitCodeFor("READY"), 0);
  assert.equal(exitCodeFor("NOT_READY"), 1);
  assert.equal(exitCodeFor("INCOMPLETE"), 2);
  assert.equal(exitCodeFor("ERROR"), 3);
});

test("criterion results reject vocabulary aliases", () => {
  const result = criterionResultSchema.safeParse({
    criterion: "The invitation persists after reload.",
    verdict: "PROVEN",
    explanation: "Legacy vocabulary must not be accepted.",
  });

  assert.equal(result.success, false);
});

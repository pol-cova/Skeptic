// Feature: evidence-persistence, Property 14: Readiness Derivation from Verdicts
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readinessFor, type Verdict } from "@skeptic/core";

/**
 * **Validates: Requirements 8.5**
 *
 * Property 14: Readiness Derivation from Verdicts
 * For any valid and complete Run_Bundle that passes schema validation,
 * uniqueness checks, and artifact reference integrity, the overall readiness
 * SHALL equal the result of `readinessFor(verdicts.map(v => v.verdict))` —
 * i.e., ERROR if any HARNESS_ERROR, NOT_READY if any FAIL,
 * INCOMPLETE if any UNVERIFIABLE, otherwise READY.
 */
describe("Property 14: Readiness Derivation from Verdicts", () => {
  const verdictArb = fc.constantFrom(
    "PASS",
    "FAIL",
    "UNVERIFIABLE",
    "HARNESS_ERROR",
  ) as fc.Arbitrary<Verdict>;
  const verdictsArrayArb = fc.array(verdictArb, {
    minLength: 1,
    maxLength: 20,
  });

  it("readinessFor produces correct readiness based on priority rules", () => {
    fc.assert(
      fc.property(verdictsArrayArb, (verdicts) => {
        const result = readinessFor(verdicts);

        // Derive expected readiness using priority rules
        const hasHarnessError = verdicts.includes("HARNESS_ERROR");
        const hasUnverifiable = verdicts.includes("UNVERIFIABLE");
        const hasFail = verdicts.includes("FAIL");

        let expected: string;
        if (hasHarnessError) {
          expected = "ERROR";
        } else if (hasFail) {
          expected = "NOT_READY";
        } else if (hasUnverifiable) {
          expected = "INCOMPLETE";
        } else {
          expected = "READY";
        }

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

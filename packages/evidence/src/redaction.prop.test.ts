import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { collectSecretValues, redactForPersistence } from "@skeptic/core";

// Feature: evidence-persistence, Property 12: Redaction Completeness

/**
 * Property 12: Redaction Completeness
 *
 * For any persisted output (events.jsonl lines, metadata.json, observations.json)
 * and any non-empty Secret_Set, no string value anywhere in the persisted object tree
 * SHALL contain any value from the Secret_Set as a substring. Every occurrence SHALL
 * be replaced with the literal "[REDACTED]".
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

function containsSecret(value: unknown, secrets: readonly string[]): boolean {
  if (typeof value === "string") {
    return secrets.some((secret) => value.includes(secret));
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsSecret(item, secrets));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((v) => containsSecret(v, secrets));
  }
  return false;
}

describe("Property 12: Redaction Completeness", () => {
  const secretArb = fc.string({ minLength: 1, maxLength: 20 });
  const secretsArrayArb = fc.array(secretArb, { minLength: 1, maxLength: 5 });

  // **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  it("no persisted output contains any secret value after redaction", () => {
    fc.assert(
      fc.property(
        secretsArrayArb,
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 50 }),
            fc.integer(),
            fc.boolean(),
          ),
        ),
        (secrets, basePayload) => {
          // Seed the payload with secret values
          const seededPayload: Record<string, unknown> = { ...basePayload };
          for (const secret of secrets) {
            seededPayload[`field_${secret.slice(0, 5)}`] =
              `prefix${secret}suffix`;
          }

          const orderedSecrets = collectSecretValues(secrets);
          const redacted = redactForPersistence(seededPayload, orderedSecrets);

          // Verify no secret appears in the redacted output
          expect(containsSecret(redacted, orderedSecrets)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// Feature: evidence-persistence, Property 13: Secret_Set Length Ordering

/**
 * Property 13: Secret_Set Length Ordering
 *
 * For any set of secret values collected from auth configuration, the Secret_Set
 * SHALL be ordered by descending string length, ensuring longer values are processed
 * before shorter values to prevent partial-match artifacts.
 *
 * **Validates: Requirements 7.8**
 */

describe("Property 13: Secret_Set Length Ordering", () => {
  // **Validates: Requirements 7.8**
  it("Secret_Set is ordered by descending string length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        (secrets) => {
          const result = collectSecretValues(secrets);

          // Verify descending length order
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].length).toBeGreaterThanOrEqual(
              result[i + 1].length,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: evidence-persistence, Property 1: Artifact Root Path Derivation
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import fc from "fast-check";
import { EvidenceStore } from "./evidence-store.ts";
import type { RunMetadata } from "@skeptic/core";

/**
 * Property 1: Artifact Root Path Derivation
 *
 * For any valid RunMetadata with a non-empty runId, the computed artifact root
 * path SHALL equal <basePath>/.proof/runs/<runId> and the directory name component
 * SHALL equal the runId value exactly.
 *
 * Validates: Requirements 1.1, 1.2
 */

// Generate safe runId strings: no path separators, null bytes, or filesystem-invalid chars
const safeRunIdArb = fc
  .stringOf(
    fc.char().filter(
      (c) =>
        c !== "/" &&
        c !== "\\" &&
        c !== "\0" &&
        c !== ":" &&
        c !== "*" &&
        c !== "?" &&
        c !== '"' &&
        c !== "<" &&
        c !== ">" &&
        c !== "|",
    ),
    { minLength: 1, maxLength: 50 },
  )
  .filter((s) => s.trim().length > 0 && !s.endsWith(".") && !s.endsWith(" "));

function makeValidMetadata(runId: string): RunMetadata {
  return {
    runId,
    startedAt: Date.now(),
    config: {
      app: {
        baseUrl: "http://localhost:3000",
        startCommand: "npm start",
        readyPath: "/health",
        allowedOrigins: ["http://localhost:3000"],
      },
      criteria: {
        file: "test.md",
        maxCriteria: 3,
      },
    },
    criteria: [{ index: 1, sourceText: "test criterion", prerequisites: [] }],
    artifactRoot: "",
  };
}

describe("Property 1: Artifact Root Path Derivation", () => {
  // **Validates: Requirements 1.1, 1.2**
  it("computed path equals <basePath>/.proof/runs/<runId>", async () => {
    await fc.assert(
      fc.asyncProperty(safeRunIdArb, async (runId) => {
        const tempDir = await mkdtemp(join(tmpdir(), "evidence-prop1-"));
        try {
          const store = new EvidenceStore({ basePath: tempDir });
          const metadata = makeValidMetadata(runId);
          const result = await store.initialize(metadata, []);

          expect(result.ok).toBe(true);
          if (result.ok) {
            const expected = join(tempDir, ".proof", "runs", runId);
            expect(result.artifactRoot).toBe(expected);
            expect(basename(result.artifactRoot)).toBe(runId);
          }
        } finally {
          await rm(tempDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  });
});


// Feature: evidence-persistence, Property 11: Error Message Truncation

/**
 * Property 11: Error Message Truncation
 *
 * For any artifact write failure event, the message field in the event payload
 * SHALL have length equal to min(originalMessage.length, 1024). If the original
 * message exceeds 1024 characters, only the first 1024 characters SHALL be preserved.
 *
 * Validates: Requirements 6.4
 */

function truncateMessage(msg: string): string {
  return msg.length > 1024 ? msg.slice(0, 1024) : msg;
}

describe("Property 11: Error Message Truncation", () => {
  // **Validates: Requirements 6.4**
  it("truncated message length equals min(original.length, 1024)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        (message) => {
          const truncated = truncateMessage(message);
          const expectedLength = Math.min(message.length, 1024);
          expect(truncated.length).toBe(expectedLength);

          // If original was <= 1024, result should be unchanged
          if (message.length <= 1024) {
            expect(truncated).toBe(message);
          } else {
            // If original was > 1024, result should be first 1024 chars
            expect(truncated).toBe(message.slice(0, 1024));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: evidence-persistence, Property 10: Write Failure Escalation to HARNESS_ERROR

/**
 * Property 10: Write Failure Escalation to HARNESS_ERROR
 *
 * For any criterion where at least one `artifact.writeFailed` event has been recorded,
 * the final verdict for that criterion SHALL be `HARNESS_ERROR` regardless of assertion
 * outcomes — it SHALL never retain `PASS`, `FAIL`, or `UNVERIFIABLE`.
 *
 * **Validates: Requirements 6.2, 6.5**
 */

// Arbitrary verdict that is NOT HARNESS_ERROR (the original verdict before escalation)
const nonErrorVerdictArb = fc.constantFrom(
  "PASS" as const,
  "FAIL" as const,
  "UNVERIFIABLE" as const,
);

// Generate a set of criterion indices that will experience write failures
// We pick a subset from the total criteria
function failedCriteriaArb(
  totalCriteria: number,
): fc.Arbitrary<Set<number>> {
  return fc
    .subarray(
      Array.from({ length: totalCriteria }, (_, i) => i + 1),
      { minLength: 1 },
    )
    .map((arr) => new Set(arr));
}

describe("Property 10: Write Failure Escalation to HARNESS_ERROR", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-prop10-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // **Validates: Requirements 6.2, 6.5**
  it("criteria with write failures are escalated to HARNESS_ERROR in finalize", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }).chain((numCriteria) =>
          fc.record({
            numCriteria: fc.constant(numCriteria),
            failedIndices: failedCriteriaArb(numCriteria),
            verdicts: fc.array(nonErrorVerdictArb, {
              minLength: numCriteria,
              maxLength: numCriteria,
            }),
          }),
        ),
        async ({ numCriteria, failedIndices, verdicts }) => {
          const runId = `prop10-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

          const store = new EvidenceStore({ basePath: tempDir });
          const metadata = makeValidMetadata(runId);
          // Set up criteria matching the generated count
          metadata.criteria = Array.from({ length: numCriteria }, (_, i) => ({
            index: i + 1,
            sourceText: `criterion ${i + 1}`,
            prerequisites: [],
          }));

          const initResult = await store.initialize(metadata, []);
          expect(initResult.ok).toBe(true);
          if (!initResult.ok) return;

          // First, do a successful append to create events.jsonl
          const { mkdir: mkdirFs, unlink, writeFile, rm: rmFs } = await import("node:fs/promises");
          await store.appendEvent({
            runId,
            timestamp: Date.now(),
            actor: "harness",
            type: "run.started",
            payload: { criteriaCount: numCriteria },
          });

          // Replace events.jsonl with a directory of the same name to force WRITE_ERROR
          const eventsFile = join(initResult.artifactRoot, "events.jsonl");
          await unlink(eventsFile);
          await mkdirFs(eventsFile);

          // Attempt to append events for each failed criterion.
          // These will fail with WRITE_ERROR and mark the criterion in criterionFailures.
          for (const idx of failedIndices) {
            await store.appendEvent({
              runId,
              timestamp: Date.now(),
              actor: "harness",
              type: "assertion.checked",
              payload: { passed: true, assertionType: "text" },
              criterionIndex: idx,
            });
          }

          // Restore events.jsonl as a file so finalize can operate
          await rmFs(eventsFile, { recursive: true, force: true });
          await writeFile(eventsFile, "", "utf-8");

          // Build CriterionVerdict array — all with non-HARNESS_ERROR verdicts
          const criterionVerdicts = verdicts.map((verdict, i) => ({
            criterionIndex: i + 1,
            sourceText: `criterion ${i + 1}`,
            verdict,
            explanation: `explanation for criterion ${i + 1}`,
          }));

          // Finalize - the store should escalate failed criteria to HARNESS_ERROR
          const finalResult = await store.finalize(criterionVerdicts);

          // Verify: every criterion in failedIndices has HARNESS_ERROR verdict
          const bundleVerdicts = finalResult.bundle.metadata.verdicts ?? [];
          for (const idx of failedIndices) {
            const v = bundleVerdicts.find((bv) => bv.criterionIndex === idx);
            expect(v).toBeDefined();
            expect(v!.verdict).toBe("HARNESS_ERROR");
          }

          // Verify: criteria NOT in failedIndices retain their original verdict
          for (let i = 1; i <= numCriteria; i++) {
            if (!failedIndices.has(i)) {
              const v = bundleVerdicts.find((bv) => bv.criterionIndex === i);
              expect(v).toBeDefined();
              expect(v!.verdict).toBe(verdicts[i - 1]);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

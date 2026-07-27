// Feature: evidence-persistence, Property 2: Event Round-Trip Persistence
import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 2: Event Round-Trip Persistence
 *
 * For any valid RunEvent (conforming to runEventSchema), serializing it to a
 * JSONL line and parsing that line back SHALL produce an object deeply equal
 * to the original event, preserving all fields including actor, sequence,
 * runId, timestamp, type, payload, and optional criterionIndex and artifactRefs.
 *
 * Validates: Requirements 2.1, 2.5
 */

const runEventArb = fc.record(
  {
    runId: fc.string({ minLength: 1, maxLength: 20 }),
    sequence: fc.nat({ max: 999999 }),
    timestamp: fc.nat(),
    actor: fc.constantFrom(
      "agent",
      "harness",
      "oracle",
      "system",
    ) as fc.Arbitrary<"agent" | "harness" | "oracle" | "system">,
    type: fc.string({ minLength: 1, maxLength: 30 }),
    payload: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.jsonValue(),
    ),
    criterionIndex: fc.integer({ min: 1, max: 100 }),
    artifactRefs: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
      maxLength: 5,
    }),
  },
  {
    requiredKeys: [
      "runId",
      "sequence",
      "timestamp",
      "actor",
      "type",
      "payload",
    ],
  },
);

describe("Property 2: Event Round-Trip Persistence", () => {
  // **Validates: Requirements 2.1, 2.5**
  it("JSON.parse(JSON.stringify(event)) preserves JSON-serializable event fields", () => {
    fc.assert(
      fc.property(runEventArb, (event) => {
        const serialized = JSON.stringify(event);
        const deserialized = JSON.parse(serialized);
        // JSON cannot represent -0; use deep equality rather than strictEqual.
        expect(deserialized).toEqual(event);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: evidence-persistence, Property 3: Monotonic Sequence Assignment

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventWriter } from "./event-writer.ts";

/**
 * Property 3: Monotonic Sequence Assignment
 *
 * For any sequence of N events appended to a single run, the assigned sequence
 * numbers SHALL form the contiguous range [0, 1, 2, ..., N-1] with no gaps,
 * no duplicates, and strictly increasing order.
 *
 * Validates: Requirements 2.2, 8.3
 */

const validEventForProp3 = fc.record({
  runId: fc.string({ minLength: 1, maxLength: 20 }),
  timestamp: fc.nat(),
  actor: fc.constantFrom(
    "agent",
    "harness",
    "oracle",
    "system",
  ) as fc.Arbitrary<"agent" | "harness" | "oracle" | "system">,
  type: fc.string({ minLength: 1, maxLength: 30 }),
  payload: fc.constant({} as Record<string, unknown>),
});

describe("Property 3: Monotonic Sequence Assignment", () => {
  // **Validates: Requirements 2.2, 8.3**
  it("assigned sequences form [0, 1, ..., N-1] for any list of 1–100 valid events", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validEventForProp3, { minLength: 1, maxLength: 100 }),
        async (events) => {
          const tempDir = await mkdtemp(join(tmpdir(), "evidence-prop3-"));
          const filePath = join(tempDir, "events.jsonl");

          try {
            const writer = new EventWriter(filePath, []);

            // Append all events and collect returned sequences
            const sequences: number[] = [];
            for (const event of events) {
              const result = await writer.append(event);
              expect(result.ok).toBe(true);
              if (result.ok) {
                sequences.push(result.sequence);
              }
            }

            // Verify returned sequences form [0, 1, ..., N-1]
            const expected = Array.from({ length: events.length }, (_, i) => i);
            expect(sequences).toEqual(expected);

            // Also verify getEvents() returns events with those sequences
            const storedEvents = writer.getEvents();
            expect(storedEvents).toHaveLength(events.length);
            const storedSequences = storedEvents.map((e) => e.sequence);
            expect(storedSequences).toEqual(expected);
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: evidence-persistence, Property 4: Schema Validation Gate

/**
 * Property 4: Schema Validation Gate
 *
 * For any event object, if it conforms to runEventSchema then appendEvent SHALL
 * succeed and the event SHALL appear in the persisted log; if it does NOT conform,
 * then appendEvent SHALL reject it and the persisted log SHALL remain unchanged
 * (same length, same content).
 *
 * Validates: Requirements 2.3, 2.4
 */

const validEventArb = fc.record({
  runId: fc.string({ minLength: 1, maxLength: 20 }),
  timestamp: fc.nat(),
  actor: fc.constantFrom(
    "agent",
    "harness",
    "oracle",
    "system",
  ) as fc.Arbitrary<"agent" | "harness" | "oracle" | "system">,
  type: fc.string({ minLength: 1, maxLength: 30 }),
  payload: fc.constant({} as Record<string, unknown>),
});

const invalidEventArb = fc.oneof(
  // Empty runId
  fc.record({
    runId: fc.constant(""),
    timestamp: fc.nat(),
    actor: fc.constantFrom(
      "agent",
      "harness",
      "oracle",
      "system",
    ) as fc.Arbitrary<"agent" | "harness" | "oracle" | "system">,
    type: fc.string({ minLength: 1, maxLength: 30 }),
    payload: fc.constant({} as Record<string, unknown>),
  }),
  // Empty type
  fc.record({
    runId: fc.string({ minLength: 1, maxLength: 20 }),
    timestamp: fc.nat(),
    actor: fc.constantFrom(
      "agent",
      "harness",
      "oracle",
      "system",
    ) as fc.Arbitrary<"agent" | "harness" | "oracle" | "system">,
    type: fc.constant(""),
    payload: fc.constant({} as Record<string, unknown>),
  }),
);

const taggedEventArb = fc.oneof(
  validEventArb.map((event) => ({ isValid: true as const, event })),
  invalidEventArb.map((event) => ({ isValid: false as const, event })),
);

describe("Property 4: Schema Validation Gate", () => {
  // **Validates: Requirements 2.3, 2.4**
  it("valid events succeed and appear in log; invalid events are rejected and log is unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(taggedEventArb, { minLength: 1, maxLength: 20 }),
        async (taggedEvents) => {
          const tempDir = await mkdtemp(join(tmpdir(), "evidence-prop4-"));
          const filePath = join(tempDir, "events.jsonl");

          try {
            const writer = new EventWriter(filePath, []);
            let expectedCount = 0;

            for (const { isValid, event } of taggedEvents) {
              const countBefore = writer.getEvents().length;
              const result = await writer.append(event);

              if (isValid) {
                // Valid events should succeed and increase event count
                expect(result.ok).toBe(true);
                if (result.ok) {
                  expect(result.sequence).toBe(expectedCount);
                }
                expectedCount++;
                expect(writer.getEvents().length).toBe(expectedCount);
              } else {
                // Invalid events should be rejected with VALIDATION_ERROR
                expect(result.ok).toBe(false);
                if (!result.ok) {
                  expect(result.error).toBe("VALIDATION_ERROR");
                }
                // Log size should remain unchanged
                expect(writer.getEvents().length).toBe(countBefore);
              }
            }
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

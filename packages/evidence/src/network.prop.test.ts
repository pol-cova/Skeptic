// Feature: evidence-persistence, Property 7: Network Observation Event Mapping
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import fc from "fast-check";
import { EvidenceStore } from "./evidence-store.ts";
import type { RunMetadata } from "@skeptic/core";

/**
 * Property 7: Network Observation Event Mapping
 *
 * For any NetworkObservation emitted by the NetworkObserver (with valid method,
 * path, and status), the Evidence_Store SHALL append a RunEvent with actor "harness",
 * type "network.observed", and a payload containing the exact method, path, and
 * status values from the observation.
 *
 * **Validates: Requirements 5.2**
 */

const networkObsArb = fc.record({
  method: fc.constantFrom("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"),
  path: fc.string({ minLength: 1, maxLength: 100 }).map((s) => "/" + s),
  status: fc.integer({ min: 100, max: 599 }),
});

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

describe("Property 7: Network Observation Event Mapping", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-prop7-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // **Validates: Requirements 5.2**
  it("after appending a network.observed event, the store tracks the observation with exact method, path, and status", async () => {
    await fc.assert(
      fc.asyncProperty(networkObsArb, async (obs) => {
        const runId = `prop7-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const store = new EvidenceStore({ basePath: tempDir });
        const metadata = makeValidMetadata(runId);

        const initResult = await store.initialize(metadata, []);
        expect(initResult.ok).toBe(true);
        if (!initResult.ok) return;

        // Append a network.observed event with the generated observation data
        const appendResult = await store.appendEvent({
          actor: "harness",
          type: "network.observed",
          payload: { method: obs.method, path: obs.path, status: obs.status },
          runId,
          timestamp: Date.now(),
        });

        expect(appendResult.ok).toBe(true);

        // Verify the observation is tracked in getNetworkObservations()
        const observations = store.getNetworkObservations();
        expect(observations.length).toBeGreaterThanOrEqual(1);

        // Find the matching observation
        const tracked = observations.find(
          (o) =>
            o.method === obs.method &&
            o.path === obs.path &&
            o.status === obs.status,
        );
        expect(tracked).toBeDefined();
        expect(tracked!.method).toBe(obs.method);
        expect(tracked!.path).toBe(obs.path);
        expect(tracked!.status).toBe(obs.status);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: evidence-persistence, Property 8: Response Assertion Matching

/**
 * Property 8: Response Assertion Matching
 *
 * For any response assertion specifying (method, path, status) and any set of
 * persisted network.observed events, the assertion SHALL pass if and only if at
 * least one persisted event contains an exact string-equal match on method and path
 * and an exact numeric-equal match on status.
 *
 * **Validates: Requirements 5.3, 5.4**
 */

const methodArb = fc.constantFrom("GET", "POST", "PUT", "DELETE", "PATCH");
const pathArb = fc.string({ minLength: 1, maxLength: 50 }).map((s) => "/" + s);
const statusArb = fc.integer({ min: 100, max: 599 });

const assertionArb = fc.record({
  method: methodArb,
  path: pathArb,
  status: statusArb,
});
const observationArb = fc.record({
  method: methodArb,
  path: pathArb,
  status: statusArb,
});

describe("Property 8: Response Assertion Matching", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-prop8-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // **Validates: Requirements 5.3, 5.4**
  it("matchResponseAssertion(a).passed === observations.some(o => o.method === a.method && o.path === a.path && o.status === a.status)", async () => {
    await fc.assert(
      fc.asyncProperty(
        assertionArb,
        fc.array(observationArb, { minLength: 0, maxLength: 50 }),
        async (assertion, observations) => {
          const runId = `prop8-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

          const store = new EvidenceStore({ basePath: tempDir });
          const metadata = makeValidMetadata(runId);

          const initResult = await store.initialize(metadata, []);
          expect(initResult.ok).toBe(true);
          if (!initResult.ok) return;

          // Append all observations as network.observed events
          for (const obs of observations) {
            await store.appendEvent({
              runId,
              timestamp: Date.now(),
              actor: "harness",
              type: "network.observed",
              payload: {
                method: obs.method,
                path: obs.path,
                status: obs.status,
              },
            });
          }

          // Evaluate assertion
          const result = store.matchResponseAssertion(assertion);

          // Compute expected result
          const hasExactMatch = observations.some(
            (o) =>
              o.method === assertion.method &&
              o.path === assertion.path &&
              o.status === assertion.status,
          );

          // Property: passed iff at least one exact match exists
          expect(result.passed).toBe(hasExactMatch);

          // If no match: verify observed has at most 10 entries and explanation is set
          if (!hasExactMatch) {
            expect(result.observed).toBeDefined();
            expect(result.observed!.length).toBeLessThanOrEqual(10);
            expect(result.explanation).toBeDefined();
            expect(result.explanation!.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

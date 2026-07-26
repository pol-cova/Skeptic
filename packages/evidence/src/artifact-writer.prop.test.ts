// Feature: evidence-persistence, Property 5: Screenshot Filename Convention
// Feature: evidence-persistence, Property 9: Network Observation Persistence Bounds
import { describe, it, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import fc from "fast-check";
import { ArtifactWriter } from "./artifact-writer.ts";
import type { NetworkObservation } from "./interfaces.ts";

/**
 * **Validates: Requirements 5.4, 5.5**
 *
 * Property 9: Network Observation Persistence Bounds
 * For any set of N network observations emitted during a run,
 * the persisted observations.json file SHALL contain exactly min(N, 5000) entries,
 * and they SHALL appear in emission order.
 */
describe("Property 9: Network Observation Persistence Bounds", () => {
  let artifactRoot: string;

  const networkObsArb: fc.Arbitrary<NetworkObservation> = fc.record({
    method: fc.constantFrom("GET", "POST", "PUT", "DELETE", "PATCH"),
    path: fc.string({ minLength: 1, maxLength: 50 }).map((s) => "/" + s),
    status: fc.integer({ min: 100, max: 599 }),
  });

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "artifact-writer-prop9-"));
  });

  afterEach(async () => {
    await rm(artifactRoot, { recursive: true, force: true });
  });

  it("persisted file contains exactly min(N, 5000) entries in emission order", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(networkObsArb, { minLength: 0, maxLength: 6000 }),
        async (observations) => {
          const writer = new ArtifactWriter(artifactRoot);
          await writer.writeNetworkObservations(observations);

          const filePath = join(artifactRoot, "network", "observations.json");
          const content = await readFile(filePath, "utf-8");
          const parsed: NetworkObservation[] = JSON.parse(content);

          const expectedLength = Math.min(observations.length, 5000);

          // Verify count matches min(N, 5000)
          if (parsed.length !== expectedLength) {
            return false;
          }

          // Verify entries match first min(N, 5000) in emission order
          const expected = observations.slice(0, 5000);
          for (let i = 0; i < parsed.length; i++) {
            if (
              parsed[i].method !== expected[i].method ||
              parsed[i].path !== expected[i].path ||
              parsed[i].status !== expected[i].status
            ) {
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 20 },
    );
  });
});

/**
 * **Validates: Requirements 3.2**
 *
 * Property 5: Screenshot Filename Convention
 * For any event sequence number `s` and criterion index `c`, the generated
 * screenshot filename SHALL equal `<s zero-padded to 6 digits>-<c>.png`
 * (e.g., sequence 3, criterion 1 → `000003-1.png`).
 */

export function screenshotFilename(
  sequence: number,
  criterionIndex: number,
): string {
  return `${String(sequence).padStart(6, "0")}-${criterionIndex}.png`;
}

describe("Property 5: Screenshot Filename Convention", () => {
  it("generates correct filenames for arbitrary sequence and criterion pairs", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 999999 }),
        fc.integer({ min: 1, max: 1000 }),
        (sequence, criterionIndex) => {
          const filename = screenshotFilename(sequence, criterionIndex);

          // Verify the filename matches the expected convention
          const expected = `${String(sequence).padStart(6, "0")}-${criterionIndex}.png`;
          if (filename !== expected) {
            return false;
          }

          // Verify structural properties:
          // 1. Starts with exactly 6 digits (zero-padded sequence)
          const prefix = filename.slice(0, 6);
          if (!/^\d{6}$/.test(prefix) || Number(prefix) !== sequence) {
            return false;
          }

          // 2. Followed by a dash separator
          if (filename[6] !== "-") {
            return false;
          }

          // 3. Then the criterionIndex as a string followed by .png
          const rest = filename.slice(7);
          const dotIndex = rest.indexOf(".");
          const indexStr = rest.slice(0, dotIndex);
          if (Number(indexStr) !== criterionIndex) {
            return false;
          }

          // 4. Ends with .png extension
          if (!filename.endsWith(".png")) {
            return false;
          }

          // 5. Overall format regex validation
          if (!/^\d{6}-\d+\.png$/.test(filename)) {
            return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

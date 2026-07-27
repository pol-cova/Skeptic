import { readFile } from "node:fs/promises";
import type { TraceProvider } from "@skeptic/evidence";

/**
 * PlaywrightTraceProvider implements the TraceProvider interface for Playwright trace archives.
 *
 * This provider uses a lazy file read pattern to reduce memory footprint:
 * - The trace path is set via setTracePath() after tracing stops (during harness close())
 * - The trace file is read lazily during finalization when getTrace() is called by EvidenceStore
 * - Throws if the trace path was not set (tracing failed or wasn't started)
 *
 * **Requirements:** 17.1, 17.2, 17.3, 17.4, 17.5
 */
export class PlaywrightTraceProvider implements TraceProvider {
  private tracePath: string | null = null;

  /**
   * Sets the path to the Playwright trace archive.
   * This method is called during PlaywrightHarness.close() after tracing stops.
   *
   * @param path - Absolute path to the trace.zip file
   */
  setTracePath(path: string): void {
    this.tracePath = path;
  }

  /**
   * Retrieves the Playwright trace archive as a Uint8Array.
   * This method is called by EvidenceStore during finalization.
   *
   * @param runId - The verification run identifier (unused in this implementation)
   * @returns The trace file contents as Uint8Array
   * @throws Error if the trace path was not set (tracing failed or wasn't started)
   */
  async getTrace(runId: string): Promise<Uint8Array> {
    if (!this.tracePath) {
      throw new Error("Trace not available. Tracing may have failed to start.");
    }
    const buffer = await readFile(this.tracePath);
    return new Uint8Array(buffer);
  }
}

import { appendFile } from "node:fs/promises";
import {
  runEventSchema,
  redactForPersistence,
  type RunEvent,
} from "@skeptic/core";
import type { AppendResult } from "./interfaces.ts";

/**
 * Handles append-only writes to events.jsonl.
 * Assigns monotonically increasing sequence numbers starting at 0.
 * Validates events against runEventSchema and redacts secrets before persisting.
 */
export class EventWriter {
  private readonly filePath: string;
  private readonly secretSet: readonly string[];
  private readonly events: RunEvent[] = [];
  private nextSequence = 0;

  constructor(filePath: string, secretSet: string[]) {
    this.filePath = filePath;
    this.secretSet = secretSet;
  }

  /**
   * Appends an event to the JSONL file.
   * The caller provides an event without a sequence number — the writer assigns it.
   * Validates the complete event, redacts secrets, then persists as a single JSON line.
   */
  async append(event: Omit<RunEvent, "sequence">): Promise<AppendResult> {
    const sequence = this.nextSequence;
    const fullEvent: RunEvent = { ...event, sequence };

    // Validate against runEventSchema
    const parseResult = runEventSchema.safeParse(fullEvent);
    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { ok: false, error: "VALIDATION_ERROR", message };
    }

    // Redact secrets before persisting
    const redactedEvent = redactForPersistence(fullEvent, this.secretSet);

    // Serialize to a single JSON line
    const line = JSON.stringify(redactedEvent) + "\n";

    // Append to file — if this fails, no partial write occurs
    try {
      await appendFile(this.filePath, line, "utf-8");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown write error";
      return { ok: false, error: "WRITE_ERROR", message };
    }

    // Only after successful write do we commit the sequence and track the event
    this.events.push(fullEvent);
    this.nextSequence = sequence + 1;

    return { ok: true, sequence };
  }

  /**
   * Returns all events that have been successfully appended (with their assigned sequences).
   * These are the pre-redaction versions for in-memory use.
   */
  getEvents(): RunEvent[] {
    return [...this.events];
  }
}

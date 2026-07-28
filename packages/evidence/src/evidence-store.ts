import { mkdir, rm, access } from "node:fs/promises";
import { join } from "node:path";

import {
  collectSecretValues,
  readinessFor,
  redactForPersistence,
  type CriterionVerdict,
  type PersistedRunBundle,
  type Readiness,
  type RunEvent,
  type RunMetadata,
} from "@skeptic/core";

import { writeFixPrompt, writeRunReports } from "@skeptic/report";

import { ArtifactWriter } from "./artifact-writer.ts";
import { BundleValidator } from "./bundle-validator.ts";
import { EventWriter } from "./event-writer.ts";
import type {
  AppendResult,
  EvidenceStoreOptions,
  FinalizeResult,
  InitResult,
  NetworkObservation,
  ResponseAssertionResult,
} from "./interfaces.ts";

/**
 * Generates the screenshot filename from sequence and criterionIndex.
 * Pattern: <sequence zero-padded to 6 digits>-<criterionIndex>.png
 */
function screenshotFilename(sequence: number, criterionIndex: number): string {
  return `${String(sequence).padStart(6, "0")}-${criterionIndex}.png`;
}

/**
 * Truncates an error message to a maximum of 1024 characters.
 */
function truncateMessage(msg: string): string {
  return msg.length > 1024 ? msg.slice(0, 1024) : msg;
}

/**
 * Races a promise against a timeout. Rejects with a descriptive error if the timeout fires first.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Manages the lifecycle of a verification run's evidence bundle.
 * Handles directory creation, event persistence, artifact writing,
 * and bundle validation.
 */
export class EvidenceStore {
  private readonly basePath: string;
  private readonly options: EvidenceStoreOptions;
  private artifactRoot: string | undefined;
  private eventWriter: EventWriter | undefined;
  private artifactWriter: ArtifactWriter | undefined;
  private metadata: RunMetadata | undefined;
  private secretSet: string[] = [];
  private networkObservations: NetworkObservation[] = [];
  private artifactRefs: Map<number, string[]> = new Map();
  private criterionFailures: Set<number> = new Set();
  /** Serializes concurrent appendEvent calls to preserve monotonic sequences. */
  private appendChain: Promise<unknown> = Promise.resolve();

  constructor(options: EvidenceStoreOptions = {}) {
    this.basePath = options.basePath ?? process.cwd();
    this.options = options;
  }

  /**
   * Constructs a properly ordered Secret_Set from raw secret values.
   * Deduplicates, filters empty strings, and sorts by descending length
   * so that longer values are processed first to avoid partial-match artifacts.
   */
  static buildSecretSet(rawSecrets: string[]): string[] {
    return collectSecretValues(rawSecrets);
  }

  /**
   * Initializes the evidence store for a new run.
   * Creates the artifact directory layout and prepares internal writers.
   *
   * @param metadata - Run metadata including runId
   * @param secretSet - Set of secret values to redact from persisted outputs
   * @returns InitResult indicating success with artifactRoot or failure with error details
   */
  async initialize(
    metadata: RunMetadata,
    secretSet: string[],
  ): Promise<InitResult> {
    const artifactRoot = join(this.basePath, ".proof", "runs", metadata.runId);

    // Detect duplicate run — if directory already exists, return error
    try {
      await access(artifactRoot);
      // If access() succeeds, directory exists → duplicate
      return {
        ok: false,
        error: "DUPLICATE_RUN",
        message: `Run directory already exists: ${artifactRoot}`,
      };
    } catch {
      // Directory does not exist — this is the expected (good) path
    }

    // Create directory structure
    try {
      await mkdir(join(artifactRoot, "screenshots"), { recursive: true });
      await mkdir(join(artifactRoot, "traces"), { recursive: true });
      await mkdir(join(artifactRoot, "network"), { recursive: true });
    } catch (err: unknown) {
      // Clean up any partial directory creation
      try {
        await rm(artifactRoot, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; ignore errors
      }

      const message =
        err instanceof Error ? err.message : "Unknown filesystem error";
      return {
        ok: false,
        error: "FS_ERROR",
        message: `Failed to create artifact layout: ${message}`,
      };
    }

    // Emit warning about screenshots potentially containing credentials
    if (this.options.logger) {
      this.options.logger.warn(
        "Screenshots and trace archives may contain visible application data including credentials rendered in the UI",
      );
    }

    // Store internal state
    this.artifactRoot = artifactRoot;
    this.metadata = metadata;
    this.secretSet = collectSecretValues(secretSet);

    const eventsFilePath = join(artifactRoot, "events.jsonl");
    this.eventWriter = new EventWriter(eventsFilePath, secretSet);
    this.artifactWriter = new ArtifactWriter(artifactRoot);

    return { ok: true, artifactRoot };
  }

  /**
   * Returns the artifact root path for the current run.
   * @throws if called before initialize()
   */
  getArtifactRoot(): string {
    if (!this.artifactRoot) {
      throw new Error(
        "EvidenceStore has not been initialized. Call initialize() first.",
      );
    }
    return this.artifactRoot;
  }

  /**
   * Appends an event to the run's event log.
   * Handles screenshot capture on failure events, network observation tracking,
   * and write failure escalation.
   */
  async appendEvent(event: Omit<RunEvent, "sequence">): Promise<AppendResult> {
    const task = this.appendChain.then(() => this.#appendEventInternal(event));
    this.appendChain = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  async #appendEventInternal(
    event: Omit<RunEvent, "sequence">,
  ): Promise<AppendResult> {
    if (!this.eventWriter || !this.artifactWriter || !this.metadata) {
      throw new Error(
        "EvidenceStore has not been initialized. Call initialize() first.",
      );
    }

    // Delegate to EventWriter for validation, sequencing, and persistence
    const result = await this.eventWriter.append(event);

    if (!result.ok) {
      if (result.error === "WRITE_ERROR") {
        // Emit artifact.writeFailed event
        const criterionIndex = event.criterionIndex ?? 0;
        await this.eventWriter.append({
          runId: this.metadata.runId,
          timestamp: Date.now(),
          actor: "harness",
          type: "artifact.writeFailed",
          payload: {
            criterionIndex,
            message: truncateMessage(result.message),
          },
          criterionIndex: event.criterionIndex,
        });

        // Escalate criterion verdict to HARNESS_ERROR
        if (criterionIndex > 0) {
          this.criterionFailures.add(criterionIndex);
        }
      }
      return result;
    }

    const { sequence } = result;

    // Check if we should capture a screenshot
    const shouldCapture =
      event.type === "assertion.checked" ||
      (event.type === "criterion.completed" &&
        (event.payload as { verdict?: string }).verdict === "FAIL");

    if (shouldCapture && this.options.screenshotProvider) {
      const criterionIndex = event.criterionIndex ?? 0;

      try {
        // Capture screenshot
        const pngData = await this.options.screenshotProvider.capture({
          runId: this.metadata.runId,
          criterionIndex,
          sequence,
        });

        try {
          // Write screenshot via ArtifactWriter
          const filename = screenshotFilename(sequence, criterionIndex);
          const relativePath = await this.artifactWriter.writeScreenshot(
            filename,
            pngData,
          );

          // Track artifact ref for this sequence
          const refs = this.artifactRefs.get(sequence) ?? [];
          refs.push(relativePath);
          this.artifactRefs.set(sequence, refs);
        } catch (writeErr: unknown) {
          // Screenshot write error → emit artifact.error event
          const message =
            writeErr instanceof Error
              ? writeErr.message
              : "Unknown screenshot write error";
          await this.eventWriter.append({
            runId: this.metadata.runId,
            timestamp: Date.now(),
            actor: "harness",
            type: "artifact.error",
            payload: {
              criterionIndex,
              message: truncateMessage(message),
              phase: "write",
            },
            criterionIndex: criterionIndex > 0 ? criterionIndex : undefined,
          });
        }
      } catch (captureErr: unknown) {
        // Screenshot capture error → emit artifact.error event
        const criterionIdx = event.criterionIndex ?? 0;
        const message =
          captureErr instanceof Error
            ? captureErr.message
            : "Unknown screenshot capture error";
        await this.eventWriter.append({
          runId: this.metadata.runId,
          timestamp: Date.now(),
          actor: "harness",
          type: "artifact.error",
          payload: {
            criterionIndex: criterionIdx,
            message: truncateMessage(message),
            phase: "capture",
          },
          criterionIndex: criterionIdx > 0 ? criterionIdx : undefined,
        });
      }
    }

    // Track network observations
    if (event.type === "network.observed") {
      const payload = event.payload as {
        method?: string;
        path?: string;
        status?: number;
      };
      if (payload.method && payload.path && payload.status !== undefined) {
        this.networkObservations.push({
          method: payload.method,
          path: payload.path,
          status: payload.status,
        });
      }
    }

    return { ok: true, sequence };
  }

  /**
   * Finalizes the run, writing metadata, traces, and network observations.
   * Validates the bundle and derives readiness from verdicts.
   */
  async finalize(verdicts: CriterionVerdict[]): Promise<FinalizeResult> {
    if (
      !this.metadata ||
      !this.artifactWriter ||
      !this.eventWriter ||
      !this.artifactRoot
    ) {
      throw new Error(
        "EvidenceStore has not been initialized. Call initialize() first.",
      );
    }

    // 1. Trace collection (if TraceProvider registered)
    let traceRef: string | undefined;
    if (this.options.traceProvider) {
      try {
        const traceData = await withTimeout(
          this.options.traceProvider.getTrace(this.metadata.runId),
          30_000,
        );
        traceRef = await this.artifactWriter.writeTrace(traceData);
      } catch (err: unknown) {
        // Emit artifact.error event — skip trace ref
        const reason =
          err instanceof Error ? err.message : "Unknown trace error";
        if (this.eventWriter) {
          await this.eventWriter.append({
            runId: this.metadata.runId,
            timestamp: Date.now(),
            actor: "harness",
            type: "artifact.error",
            payload: { artifact: "trace", reason: truncateMessage(reason) },
          });
        }
      }
    }

    // 2. Write network observations (redacted)
    const redactedObservations =
      this.secretSet.length > 0
        ? redactForPersistence(this.networkObservations, this.secretSet)
        : this.networkObservations;
    await this.artifactWriter.writeNetworkObservations(redactedObservations);

    // 3. Build PersistedRunBundle
    const events = this.eventWriter.getEvents().map((e) => ({
      ...e,
      artifactRefs: this.artifactRefs.get(e.sequence) ?? e.artifactRefs ?? [],
    }));

    // Escalate verdicts for criteria with write failures
    const adjustedVerdicts = verdicts.map((v) => {
      if (this.criterionFailures.has(v.criterionIndex)) {
        return { ...v, verdict: "HARNESS_ERROR" as const };
      }
      return v;
    });

    const bundle: PersistedRunBundle = {
      metadata: {
        ...this.metadata,
        finishedAt: Date.now(),
        verdicts: adjustedVerdicts,
        artifactRoot: this.artifactRoot,
      },
      events,
    };

    // 4. Validate
    const validation = new BundleValidator().validate(
      bundle,
      this.artifactRoot,
    );

    // 5. Derive readiness
    let readiness: Readiness;
    if (!validation.valid) {
      readiness = "ERROR";
    } else {
      readiness = readinessFor(adjustedVerdicts.map((v) => v.verdict));
    }

    // 6. Update metadata with readiness
    bundle.metadata.readiness = readiness;
    bundle.metadata.finishedAt = Date.now();

    // 7. Write metadata.json (applies redaction internally)
    await this.artifactWriter.writeMetadata(bundle.metadata, this.secretSet);

    // 8. Generate static HTML and Markdown reports
    await writeRunReports(bundle, { artifactRoot: this.artifactRoot });

    // 9. Write fix prompt when verification found actionable failures
    const fixPrompt = await writeFixPrompt(bundle, {
      artifactRoot: this.artifactRoot,
    });
    const fixPromptPath = fixPrompt?.fixPromptPath;

    // 10. Return result
    if (validation.valid) {
      return { ok: true, bundle, readiness, fixPromptPath };
    }

    return {
      ok: false,
      bundle,
      readiness: "ERROR",
      validationErrors: [
        ...validation.errors,
        ...validation.unresolvedRefs.map((r) => `Unresolved ref: ${r}`),
      ],
      fixPromptPath,
    };
  }

  /**
   * Returns tracked network observations for persistence during finalize.
   */
  getNetworkObservations(): NetworkObservation[] {
    return [...this.networkObservations];
  }

  /**
   * Evaluates a response assertion against persisted network observations.
   * Searches for an exact match on method (string-equal), path (string-equal),
   * and status (numeric-equal).
   *
   * @param assertion - The response assertion to evaluate
   * @returns Result with pass/fail and observed entries on failure
   */
  matchResponseAssertion(assertion: {
    method: string;
    path: string;
    status: number;
  }): ResponseAssertionResult {
    const match = this.networkObservations.some(
      (obs) =>
        obs.method === assertion.method &&
        obs.path === assertion.path &&
        obs.status === assertion.status,
    );

    if (match) {
      return { passed: true };
    }

    return {
      passed: false,
      observed: this.networkObservations.slice(0, 10),
      explanation: "No matching request was observed",
    };
  }

  /**
   * Returns artifact refs tracked by sequence number.
   */
  getArtifactRefs(): Map<number, string[]> {
    return new Map(this.artifactRefs);
  }

  /**
   * Returns the set of criterion indices that experienced write failures.
   */
  getCriterionFailures(): Set<number> {
    return new Set(this.criterionFailures);
  }
}

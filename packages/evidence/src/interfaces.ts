import type { PersistedRunBundle, Readiness } from "@skeptic/core";

// --- Provider Interfaces ---

export interface ScreenshotCaptureContext {
  runId: string;
  criterionIndex: number;
  sequence: number;
}

export interface ScreenshotProvider {
  capture(context: ScreenshotCaptureContext): Promise<Uint8Array>;
}

export interface TraceProvider {
  getTrace(runId: string): Promise<Uint8Array>;
}

export interface NetworkObservation {
  /** Non-empty HTTP method */
  method: string;
  /** Non-empty request path */
  path: string;
  /** HTTP status code (100–599) */
  status: number;
}

export interface NetworkObserver {
  subscribe(handler: (observation: NetworkObservation) => void): void;
  unsubscribe(): void;
}

// --- Logger Interface ---

export interface EvidenceLogger {
  warn(message: string): void;
  error(message: string): void;
}

// --- Store Options ---

export interface EvidenceStoreOptions {
  /** Absolute base path (defaults to `process.cwd()`) */
  basePath?: string;
  /** Provider for capturing screenshots */
  screenshotProvider?: ScreenshotProvider;
  /** Provider for trace archive */
  traceProvider?: TraceProvider;
  /** Observer for network traffic */
  networkObserver?: NetworkObserver;
  /** Logger for warnings (e.g., screenshot-contains-secrets) */
  logger?: EvidenceLogger;
}

// --- Result Types ---

export type InitResult =
  | { ok: true; artifactRoot: string }
  | { ok: false; error: "DUPLICATE_RUN" | "FS_ERROR"; message: string };

export type AppendResult =
  | { ok: true; sequence: number }
  | { ok: false; error: "VALIDATION_ERROR" | "WRITE_ERROR"; message: string };

export type FinalizeResult =
  | { ok: true; bundle: PersistedRunBundle; readiness: Readiness }
  | {
      ok: false;
      bundle: PersistedRunBundle;
      readiness: "ERROR";
      validationErrors: string[];
    };

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  unresolvedRefs: string[];
}

// --- Assertion Result Types ---

export interface ResponseAssertionResult {
  passed: boolean;
  observed?: NetworkObservation[];
  explanation?: string;
}

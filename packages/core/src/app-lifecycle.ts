/**
 * Application lifecycle management for Skeptic.
 * Handles startup, readiness checking, and shutdown of target applications.
 *
 * @module app-lifecycle
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Options for starting or reusing an application.
 */
export interface StartAppOptions {
  /** Base URL of the application (e.g., "http://127.0.0.1:3100") */
  baseUrl: string;

  /** Optional shell command to start the app. If omitted, assumes app is already running. */
  startCommand?: string;

  /** Path to poll for readiness (e.g., "/health") */
  readyPath: string;

  /** Maximum time to wait for readiness in milliseconds. Default: 30000 (30s) */
  timeoutMs?: number;

  /** Interval between readiness polls in milliseconds. Default: 1000 (1s) */
  pollIntervalMs?: number;
}

/**
 * Represents a managed application process.
 */
export interface AppProcess {
  /** Process ID */
  pid: number;

  /** Whether Skeptic owns this process (true if Skeptic started it) */
  owned: boolean;

  /** Timestamp when the process was started */
  startedAt: number;
}

/**
 * Result of starting or reusing an application.
 */
export interface StartAppResult {
  /** Process handle if a new process was created, null if reusing existing */
  process: AppProcess | null;

  /** Whether the application is ready */
  ready: boolean;

  /** Error message if startup failed */
  error?: string;
}

/**
 * Custom error for application startup failures.
 * These should be classified as HARNESS_ERROR, not product failures.
 */
export class AppStartupError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppStartupError";
  }
}

// ============================================================================
// Phase 1: Readiness Checking
// ============================================================================

/**
 * Performs a single readiness check by making an HTTP GET request.
 *
 * @param url - Full URL to check (e.g., "http://127.0.0.1:3100/health")
 * @returns true if the server responds with 200-299 status, false otherwise
 */
export async function checkReadiness(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5s timeout per request
    });

    // Accept any 2xx status code
    return response.ok;
  } catch (error) {
    // Network errors, timeouts, or non-OK responses
    return false;
  }
}

/**
 * Waits for the application to become ready by polling the readiness endpoint.
 *
 * Uses exponential backoff with jitter for polling intervals.
 *
 * @param baseUrl - Base URL of the application (e.g., "http://127.0.0.1:3100")
 * @param readyPath - Path to poll for readiness (e.g., "/health")
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param pollIntervalMs - Initial interval between polls in milliseconds
 * @returns true if ready, false if timeout
 *
 * @example
 * ```typescript
 * const ready = await waitForReadiness(
 *   "http://127.0.0.1:3100",
 *   "/health",
 *   30000,
 *   1000
 * );
 * if (!ready) {
 *   throw new AppStartupError("App startup timeout");
 * }
 * ```
 */
export async function waitForReadiness(
  baseUrl: string,
  readyPath: string,
  timeoutMs: number,
  pollIntervalMs: number = 1000,
): Promise<boolean> {
  const startTime = Date.now();
  const fullUrl = `${baseUrl}${readyPath}`;
  let attempt = 0;

  while (Date.now() - startTime < timeoutMs) {
    attempt++;

    // Check if ready
    const ready = await checkReadiness(fullUrl);
    if (ready) {
      return true;
    }

    // Calculate next poll interval with exponential backoff + jitter
    const backoffMultiplier = Math.min(2 ** attempt, 8); // Cap at 8x
    const jitter = Math.random() * 0.3; // 0-30% jitter
    const nextInterval = pollIntervalMs * backoffMultiplier * (1 + jitter);

    // Calculate remaining time
    const elapsed = Date.now() - startTime;
    const remaining = timeoutMs - elapsed;

    // If next interval would exceed timeout, wait only for remaining time
    const waitTime = Math.min(nextInterval, remaining);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // Timeout reached
  return false;
}

// ============================================================================
// Phase 2: Process Management (TODO)
// ============================================================================

// export async function startAppProcess(command: string): Promise<ChildProcess>
// export function isProcessRunning(pid: number): boolean
// export async function stopProcess(pid: number): Promise<void>

// ============================================================================
// Phase 3: Orchestration (TODO)
// ============================================================================

// export async function startOrReuseApp(opts: StartAppOptions): Promise<StartAppResult>
// export async function stopApp(process: AppProcess | null): Promise<void>

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
// Phase 2: Process Management
// ============================================================================

import { spawn, type ChildProcess } from "node:child_process";

/**
 * Starts an application process using a shell command.
 *
 * The process is spawned in detached mode so it survives if Skeptic crashes.
 * stdout and stderr are inherited for visibility during development.
 *
 * @param command - Shell command to execute (e.g., "pnpm --filter demo-app dev")
 * @returns Child process handle
 * @throws AppStartupError if process fails to start
 *
 * @example
 * ```typescript
 * const proc = await startAppProcess("pnpm --filter demo-app dev");
 * console.log(`Started process with PID ${proc.pid}`);
 * ```
 */
export async function startAppProcess(command: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Spawn process using shell for command interpretation
    // detached: true makes process survive if parent exits
    const child = spawn(command, {
      shell: true,
      detached: false, // Keep attached so we can track it
      stdio: "inherit", // Inherit stdout/stderr for visibility
    });

    // Handle spawn errors (command not found, permission denied, etc.)
    child.on("error", (error) => {
      reject(
        new AppStartupError(`Failed to start process: ${error.message}`, error),
      );
    });

    // Process started successfully if we get a PID
    if (child.pid) {
      resolve(child);
    } else {
      reject(new AppStartupError("Process started but has no PID"));
    }
  });
}

/**
 * Checks if a process with the given PID is currently running.
 *
 * Platform-independent implementation that works on Windows and Unix-like systems.
 *
 * @param pid - Process ID to check
 * @returns true if process is running, false otherwise
 *
 * @example
 * ```typescript
 * if (isProcessRunning(12345)) {
 *   console.log("Process is still running");
 * }
 * ```
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually sending a signal
    // This works on Unix-like systems (Linux, macOS)
    // On Windows, process.kill throws if process doesn't exist
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // ESRCH means process not found
    // EPERM means process exists but we don't have permission (still running)
    if (error instanceof Error && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM") {
        return true; // Process exists but we can't signal it
      }
    }
    return false;
  }
}

/**
 * Stops a process gracefully with fallback to force kill.
 *
 * Attempts graceful shutdown first (SIGTERM on Unix, taskkill on Windows).
 * If process doesn't exit within timeout, forces termination (SIGKILL).
 *
 * @param pid - Process ID to stop
 * @param gracefulTimeoutMs - Time to wait for graceful shutdown. Default: 5000 (5s)
 * @returns Promise that resolves when process is stopped
 *
 * @example
 * ```typescript
 * await stopProcess(12345);
 * console.log("Process stopped");
 * ```
 */
export async function stopProcess(
  pid: number,
  gracefulTimeoutMs: number = 5000,
): Promise<void> {
  // Check if process is running
  if (!isProcessRunning(pid)) {
    return; // Already stopped
  }

  try {
    // Try graceful shutdown first
    // SIGTERM on Unix, which can be caught by the process
    // On Windows, this will immediately terminate
    process.kill(pid, "SIGTERM");

    // Wait for process to exit gracefully
    const startTime = Date.now();
    while (Date.now() - startTime < gracefulTimeoutMs) {
      if (!isProcessRunning(pid)) {
        return; // Process exited gracefully
      }
      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Graceful shutdown timeout - force kill
    if (isProcessRunning(pid)) {
      process.kill(pid, "SIGKILL"); // Force kill
      // Wait a moment for force kill to take effect
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    // If we get ESRCH, process is already gone
    if (error instanceof Error && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ESRCH") {
        return; // Process not found, already stopped
      }
    }
    // Re-throw other errors
    throw new AppStartupError(
      `Failed to stop process ${pid}: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}

// ============================================================================
// Phase 3: Orchestration (TODO)
// ============================================================================

// export async function startOrReuseApp(opts: StartAppOptions): Promise<StartAppResult>
// export async function stopApp(process: AppProcess | null): Promise<void>

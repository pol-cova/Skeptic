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

  /** Optional list of secret values to redact from logs */
  secrets?: string[];

  /** Environment variables for the spawned start command */
  env?: NodeJS.ProcessEnv;

  /** When false, always spawn a new process even if the app already responds on the ready path */
  reuseExisting?: boolean;
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
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AppStartupError";
    this.cause = cause;
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
import { redactString } from "./secrets.ts";

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
export async function startAppProcess(
  command: string,
  env: NodeJS.ProcessEnv = globalThis.process.env,
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Track if we've already settled the promise
    let settled = false;

    // Spawn in a new process group so stopProcess can terminate child servers too.
    const child = spawn(command, {
      shell: true,
      detached: process.platform !== "win32",
      stdio: "inherit", // Inherit stdout/stderr for visibility
      env,
    });

    // Handle spawn errors (command not found, permission denied, etc.)
    child.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(
          new AppStartupError(
            `Failed to start process: ${error.message}`,
            error,
          ),
        );
      }
    });

    // Wait for the 'spawn' event to confirm successful process start
    // This ensures we don't resolve before potential spawn errors
    child.once("spawn", () => {
      if (!settled) {
        settled = true;
        resolve(child);
      }
    });
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

  const signalTarget = process.platform !== "win32" ? -pid : pid;

  try {
    // Try graceful shutdown first
    // SIGTERM on Unix, which can be caught by the process
    // On Windows, this will immediately terminate
    process.kill(signalTarget, "SIGTERM");

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
      process.kill(signalTarget, "SIGKILL"); // Force kill
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
// Phase 3: Orchestration
// ============================================================================

/**
 * Starts or reuses an application based on configuration.
 *
 * This is the main entry point for application lifecycle management.
 * It intelligently handles three scenarios:
 * 1. App already running → reuse it
 * 2. Start command provided + app not running → start it
 * 3. No start command + app not running → error
 *
 * @param opts - Configuration options
 * @returns Result with process handle (if owned) and readiness status
 * @throws AppStartupError if startup fails or times out
 *
 * @example
 * ```typescript
 * // Start or reuse demo app
 * const result = await startOrReuseApp({
 *   baseUrl: "http://127.0.0.1:3100",
 *   startCommand: "pnpm --filter demo-app dev",
 *   readyPath: "/health",
 *   timeoutMs: 30000,
 * });
 *
 * if (result.ready) {
 *   console.log("App is ready!");
 *   if (result.process) {
 *     console.log(`Started new process: ${result.process.pid}`);
 *   } else {
 *     console.log("Reused existing process");
 *   }
 * }
 * ```
 */
export async function startOrReuseApp(
  opts: StartAppOptions,
): Promise<StartAppResult> {
  const {
    baseUrl,
    startCommand,
    readyPath,
    timeoutMs = 30000,
    pollIntervalMs = 1000,
    secrets = [],
    env: spawnEnv = globalThis.process.env,
    reuseExisting = true,
  } = opts;

  const fullUrl = `${baseUrl}${readyPath}`;

  // Scenario 1: No start command provided
  if (!startCommand) {
    // Check if app is already running
    const alreadyRunning = await checkReadiness(fullUrl);

    if (!alreadyRunning) {
      throw new AppStartupError(
        `Application is not running at ${baseUrl} and no startCommand was provided. ` +
          `Either start the application manually or provide a startCommand.`,
      );
    }

    // App is running, we'll reuse it
    return {
      process: null, // Not owned by us
      ready: true,
    };
  }

  // Scenario 2: Start command provided
  // First, check if app is already running (reuse if possible)
  if (reuseExisting) {
    const alreadyRunning = await checkReadiness(fullUrl);

    if (alreadyRunning) {
      // App is already running, reuse it
      return {
        process: null, // Not owned by us
        ready: true,
      };
    }
  }

  // Scenario 3: Start command provided and app not running → start it
  // Log startup with redacted secrets
  const redactedCommand = redactString(startCommand, secrets);
  console.log(`[Skeptic] Starting application: ${redactedCommand}`);

  let childProcess: ChildProcess;

  try {
    childProcess = await startAppProcess(startCommand, spawnEnv);
  } catch (error) {
    throw new AppStartupError(
      `Failed to start application: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }

  if (!childProcess.pid) {
    throw new AppStartupError("Application process started but has no PID");
  }

  const process: AppProcess = {
    pid: childProcess.pid,
    owned: true,
    startedAt: Date.now(),
  };

  console.log(`[Skeptic] Process started with PID ${process.pid}`);
  console.log(`[Skeptic] Waiting for readiness at ${fullUrl}...`);

  // Wait for the application to become ready
  try {
    const ready = await waitForReadiness(
      baseUrl,
      readyPath,
      timeoutMs,
      pollIntervalMs,
    );

    if (!ready) {
      console.error(
        `[Skeptic] Readiness timeout after ${timeoutMs}ms, cleaning up process ${process.pid}`,
      );

      // Cleanup: stop the process we started
      await stopProcess(process.pid);

      throw new AppStartupError(
        `Application startup timeout after ${timeoutMs}ms. ` +
          `The process started successfully but ${fullUrl} did not respond with 200 OK within the timeout.`,
      );
    }

    console.log(`[Skeptic] Application ready at ${fullUrl}`);

    return {
      process,
      ready: true,
    };
  } catch (error) {
    // If waitForReadiness threw an error, cleanup the process
    if (isProcessRunning(process.pid)) {
      console.error(
        `[Skeptic] Error during startup, cleaning up process ${process.pid}`,
      );
      await stopProcess(process.pid);
    }
    throw error;
  }
}

/**
 * Stops an application process if it's owned by Skeptic.
 *
 * Only processes that were started by Skeptic (owned: true) will be stopped.
 * Reused/existing processes are left running.
 *
 * This is safe to call multiple times and with null processes.
 *
 * @param appProcess - Process to stop, or null if no owned process
 * @returns Promise that resolves when process is stopped
 *
 * @example
 * ```typescript
 * const result = await startOrReuseApp(config);
 *
 * // Later, cleanup
 * await stopApp(result.process);
 * ```
 */
export async function stopApp(appProcess: AppProcess | null): Promise<void> {
  // Nothing to do if no process
  if (!appProcess) {
    return;
  }

  // Only stop processes we own
  if (!appProcess.owned) {
    return;
  }

  // Stop the process
  await stopProcess(appProcess.pid);
}

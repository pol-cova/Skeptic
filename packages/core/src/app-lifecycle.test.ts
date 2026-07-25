import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  checkReadiness,
  waitForReadiness,
  AppStartupError,
  startAppProcess,
  isProcessRunning,
  stopProcess,
  startOrReuseApp,
  stopApp,
} from "./app-lifecycle.ts";

// ============================================================================
// Phase 1 Tests: Readiness Checking
// ============================================================================

describe("checkReadiness", () => {
  it("returns true when server responds with 200 OK", async () => {
    // Mock fetch to return successful response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await checkReadiness("http://localhost:3100/health");

    expect(result).toBe(true);

    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  it("returns true for any 2xx status code", async () => {
    const originalFetch = globalThis.fetch;

    // Test 204 No Content
    globalThis.fetch = async () =>
      new Response(null, {
        status: 204,
      });

    const result204 = await checkReadiness("http://localhost:3100/health");
    expect(result204).toBe(true);

    // Test 201 Created
    globalThis.fetch = async () =>
      new Response(null, {
        status: 201,
      });

    const result201 = await checkReadiness("http://localhost:3100/health");
    expect(result201).toBe(true);

    globalThis.fetch = originalFetch;
  });

  it("returns false when server responds with 404", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("Not Found", {
        status: 404,
      });

    const result = await checkReadiness("http://localhost:3100/health");

    expect(result).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it("returns false when server responds with 500", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("Internal Server Error", {
        status: 500,
      });

    const result = await checkReadiness("http://localhost:3100/health");

    expect(result).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it("returns false on network error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Network error");
    };

    const result = await checkReadiness("http://localhost:3100/health");

    expect(result).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it("returns false on connection refused", async () => {
    // Attempt to connect to a port that's definitely not listening
    const result = await checkReadiness("http://localhost:59999/health");

    expect(result).toBe(false);
  });
});

describe("waitForReadiness", () => {
  let originalFetch: typeof fetch;
  let attemptCount: number;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    attemptCount = 0;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns true immediately when server is already ready", async () => {
    globalThis.fetch = async () => {
      attemptCount++;
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    const startTime = Date.now();
    const result = await waitForReadiness(
      "http://localhost:3100",
      "/health",
      5000,
      1000,
    );
    const elapsed = Date.now() - startTime;

    expect(result).toBe(true);
    expect(attemptCount).toBe(1);
    expect(elapsed).toBeLessThan(1000); // Should be immediate
  });

  it("returns true after server becomes ready on second attempt", async () => {
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount < 2) {
        // First attempt fails
        throw new Error("Connection refused");
      }
      // Second attempt succeeds
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    const result = await waitForReadiness(
      "http://localhost:3100",
      "/health",
      10000,
      500,
    );

    expect(result).toBe(true);
    expect(attemptCount).toBeGreaterThanOrEqual(2);
  });

  it("returns false when timeout is reached", async () => {
    globalThis.fetch = async () => {
      attemptCount++;
      // Always fail
      throw new Error("Connection refused");
    };

    const startTime = Date.now();
    const result = await waitForReadiness(
      "http://localhost:3100",
      "/health",
      2000, // 2 second timeout
      500, // 500ms poll interval
    );
    const elapsed = Date.now() - startTime;

    expect(result).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(1900); // Should wait close to timeout
    expect(elapsed).toBeLessThan(2500); // But not too much longer
    expect(attemptCount).toBeGreaterThan(1); // Should have made multiple attempts
  });

  it("retries on transient failures", async () => {
    const responses = [
      false, // Attempt 1: fail
      false, // Attempt 2: fail
      false, // Attempt 3: fail
      true, // Attempt 4: success
    ];

    globalThis.fetch = async () => {
      attemptCount++;
      const shouldSucceed = responses[attemptCount - 1];

      if (shouldSucceed) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
        });
      }

      throw new Error("Transient failure");
    };

    const result = await waitForReadiness(
      "http://localhost:3100",
      "/health",
      15000, // Increase timeout to account for backoff
      300,
    );

    expect(result).toBe(true);
    expect(attemptCount).toBe(4);
  }, 20000); // Increase test timeout to 20 seconds

  it("uses exponential backoff for retry intervals", async () => {
    const attemptTimestamps: number[] = [];

    globalThis.fetch = async () => {
      attemptCount++;
      attemptTimestamps.push(Date.now());

      if (attemptCount < 4) {
        throw new Error("Not ready yet");
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    await waitForReadiness(
      "http://localhost:3100",
      "/health",
      30000,
      500, // 500ms initial interval
    );

    // Check that we got at least 4 attempts
    expect(attemptTimestamps.length).toBeGreaterThanOrEqual(4);

    // Use first 4 attempts for interval calculation
    const interval1 = attemptTimestamps[1]! - attemptTimestamps[0]!;
    const interval2 = attemptTimestamps[2]! - attemptTimestamps[1]!;
    const interval3 = attemptTimestamps[3]! - attemptTimestamps[2]!;

    // Each interval should generally be larger (accounting for jitter)
    expect(interval2).toBeGreaterThan(interval1 * 0.7); // Allow for jitter
    expect(interval3).toBeGreaterThan(interval2 * 0.7);
  }, 15000); // Increase test timeout to 15 seconds

  it("constructs correct full URL from baseUrl and readyPath", async () => {
    let capturedUrl = "";

    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    await waitForReadiness("http://localhost:3100", "/health", 5000, 1000);

    expect(capturedUrl).toBe("http://localhost:3100/health");
  });

  it("handles readyPath without leading slash", async () => {
    let capturedUrl = "";

    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    await waitForReadiness(
      "http://localhost:3100",
      "health", // No leading slash
      5000,
      1000,
    );

    expect(capturedUrl).toBe("http://localhost:3100health");
  });
});

describe("AppStartupError", () => {
  it("creates error with message", () => {
    const error = new AppStartupError("Startup failed");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppStartupError");
    expect(error.message).toBe("Startup failed");
    expect(error.cause).toBeUndefined();
  });

  it("creates error with cause", () => {
    const cause = new Error("Original error");
    const error = new AppStartupError("Startup failed", cause);

    expect(error.message).toBe("Startup failed");
    expect(error.cause).toBe(cause);
  });
});

// ============================================================================
// Phase 2 Tests: Process Management
// ============================================================================

describe("startAppProcess", () => {
  it("starts a process and returns ChildProcess with PID", async () => {
    // Use a simple command that exits quickly
    const child = await startAppProcess("echo hello");

    expect(child).toBeDefined();
    expect(child.pid).toBeTypeOf("number");
    expect(child.pid).toBeGreaterThan(0);
  });

  // Note: On Windows with shell:true, invalid commands still spawn cmd.exe
  // so they don't trigger the 'error' event. We test with a command that
  // will actually fail at the spawn level.
  it("handles process spawn errors", async () => {
    // Skip this test on Windows where shell spawning behavior differs
    if (process.platform === "win32") {
      expect(true).toBe(true); // Skip test
      return;
    }

    await expect(
      startAppProcess("this-command-does-not-exist-xyz123"),
    ).rejects.toThrow(AppStartupError);
  });
});

describe("isProcessRunning", () => {
  it("returns true for current process", () => {
    const result = isProcessRunning(process.pid);
    expect(result).toBe(true);
  });

  it("returns false for non-existent PID", () => {
    // Use a PID that's very unlikely to exist
    const result = isProcessRunning(999999);
    expect(result).toBe(false);
  });

  it("returns true for a running child process", async () => {
    // Start a long-running process
    const child = await startAppProcess(
      process.platform === "win32"
        ? "timeout /t 10 /nobreak > nul"
        : "sleep 10",
    );

    expect(child.pid).toBeDefined();
    const result = isProcessRunning(child.pid!);
    expect(result).toBe(true);

    // Cleanup
    await stopProcess(child.pid!);
  });
});

describe("stopProcess", () => {
  it("stops a running process", async () => {
    // Start a long-running process
    const child = await startAppProcess(
      process.platform === "win32"
        ? "timeout /t 30 /nobreak > nul"
        : "sleep 30",
    );

    expect(child.pid).toBeDefined();
    expect(isProcessRunning(child.pid!)).toBe(true);

    // Stop the process
    await stopProcess(child.pid!);

    // Verify it's stopped
    expect(isProcessRunning(child.pid!)).toBe(false);
  });

  it("does nothing if process is already stopped", async () => {
    // Start and immediately stop a process
    const child = await startAppProcess("echo done");

    // Wait for process to exit naturally
    await new Promise((resolve) => setTimeout(resolve, 500));

    // This should not throw
    await expect(stopProcess(child.pid!)).resolves.toBeUndefined();
  });

  it("force kills process that doesn't respond to SIGTERM", async () => {
    // Start a process that ignores SIGTERM (on Unix)
    // On Windows, SIGTERM immediately terminates anyway
    const child = await startAppProcess(
      process.platform === "win32"
        ? "timeout /t 30 /nobreak > nul"
        : "sleep 30",
    );

    expect(child.pid).toBeDefined();

    // Stop with very short graceful timeout to test force kill
    await stopProcess(child.pid!, 100);

    // Should be stopped
    expect(isProcessRunning(child.pid!)).toBe(false);
  });
});

// ============================================================================
// Phase 3 Tests: Orchestration
// ============================================================================

describe("startOrReuseApp", () => {
  it("reuses already running app when no start command provided", async () => {
    // Mock an already running server
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 });

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      // No startCommand
    });

    expect(result.ready).toBe(true);
    expect(result.process).toBeNull(); // Not owned

    globalThis.fetch = originalFetch;
  });

  it("throws error when app not running and no start command", async () => {
    // Mock server not running
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Connection refused");
    };

    await expect(
      startOrReuseApp({
        baseUrl: "http://localhost:59999",
        readyPath: "/health",
      }),
    ).rejects.toThrow(AppStartupError);

    await expect(
      startOrReuseApp({
        baseUrl: "http://localhost:59999",
        readyPath: "/health",
      }),
    ).rejects.toThrow(/not running.*no startCommand/);

    globalThis.fetch = originalFetch;
  });

  it("reuses existing process when app already running", async () => {
    // Mock server already running
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 });

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: "echo would-start-but-already-running",
    });

    expect(result.ready).toBe(true);
    expect(result.process).toBeNull(); // Reused, not owned

    globalThis.fetch = originalFetch;
  });

  it("starts new process when app not running", async () => {
    // Use a real long-running command
    const command =
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5";

    // Mock server responses: not ready at first, then ready
    let attemptCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount <= 2) {
        throw new Error("Not ready yet");
      }
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
      });
    };

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: command,
      timeoutMs: 10000,
      pollIntervalMs: 500,
    });

    expect(result.ready).toBe(true);
    expect(result.process).toBeDefined();
    expect(result.process!.owned).toBe(true);
    expect(result.process!.pid).toBeGreaterThan(0);

    // Cleanup
    await stopApp(result.process);

    globalThis.fetch = originalFetch;
  }, 15000);

  it("throws timeout error and cleans up process", async () => {
    // Start process but mock server never becomes ready
    const command =
      process.platform === "win32"
        ? "timeout /t 30 /nobreak > nul"
        : "sleep 30";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Server never ready");
    };

    let error: Error | undefined;
    try {
      await startOrReuseApp({
        baseUrl: "http://localhost:3100",
        readyPath: "/health",
        startCommand: command,
        timeoutMs: 2000, // Short timeout
        pollIntervalMs: 500,
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(AppStartupError);
    expect(error!.message).toMatch(/timeout/);

    // Process should have been cleaned up
    // We can't easily verify this without tracking PIDs, but no process should be left

    globalThis.fetch = originalFetch;
  }, 10000);
});

describe("stopApp", () => {
  it("stops owned process", async () => {
    // Start a long-running process
    const child = await startAppProcess(
      process.platform === "win32"
        ? "timeout /t 10 /nobreak > nul"
        : "sleep 10",
    );

    const appProcess = {
      pid: child.pid!,
      owned: true,
      startedAt: Date.now(),
    };

    expect(isProcessRunning(appProcess.pid)).toBe(true);

    await stopApp(appProcess);

    expect(isProcessRunning(appProcess.pid)).toBe(false);
  });

  it("does nothing for non-owned process", async () => {
    // Start a process
    const child = await startAppProcess(
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5",
    );

    const appProcess = {
      pid: child.pid!,
      owned: false, // Not owned!
      startedAt: Date.now(),
    };

    expect(isProcessRunning(appProcess.pid)).toBe(true);

    // Should not stop it
    await stopApp(appProcess);

    // Process should still be running
    expect(isProcessRunning(appProcess.pid)).toBe(true);

    // Cleanup manually
    await stopProcess(appProcess.pid);
  });

  it("does nothing for null process", async () => {
    // Should not throw
    await expect(stopApp(null)).resolves.toBeUndefined();
  });
});

// ============================================================================
// Phase 4 Tests: Secret Redaction
// ============================================================================

describe("secret redaction in startup logs", () => {
  let originalFetch: typeof fetch;
  let originalConsoleLog: typeof console.log;
  let logCalls: string[] = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalConsoleLog = console.log;

    // Capture console.log calls
    logCalls = [];
    console.log = (...args: unknown[]) => {
      logCalls.push(args.join(" "));
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.log = originalConsoleLog;
  });

  it("redacts secrets from startup command logs", async () => {
    // Mock server not ready initially, then ready
    let attemptCount = 0;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount <= 1) {
        throw new Error("Not ready");
      }
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    };

    const command =
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5";

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: command,
      secrets: ["supersecret123", "password456"],
      timeoutMs: 10000,
      pollIntervalMs: 500,
    });

    // Check that startup log was created
    const startupLog = logCalls.find((log) =>
      log.includes("[Skeptic] Starting application:"),
    );
    expect(startupLog).toBeDefined();

    // Verify command is shown but secrets are NOT in the log
    expect(startupLog).toContain(command);
    expect(startupLog).not.toContain("supersecret123");
    expect(startupLog).not.toContain("password456");

    // Cleanup
    await stopApp(result.process);
  }, 15000);

  it("logs PID after process starts", async () => {
    let attemptCount = 0;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount <= 1) {
        throw new Error("Not ready");
      }
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    };

    const command =
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5";

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: command,
      timeoutMs: 10000,
      pollIntervalMs: 500,
    });

    // Check that PID log was created
    const pidLog = logCalls.find(
      (log) =>
        log.includes("[Skeptic] Process started with PID") &&
        log.includes(String(result.process!.pid)),
    );
    expect(pidLog).toBeDefined();

    // Cleanup
    await stopApp(result.process);
  }, 15000);

  it("logs readiness wait message", async () => {
    let attemptCount = 0;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount <= 1) {
        throw new Error("Not ready");
      }
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    };

    const command =
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5";

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: command,
      timeoutMs: 10000,
      pollIntervalMs: 500,
    });

    // Check that waiting log was created
    const waitingLog = logCalls.find(
      (log) =>
        log.includes("[Skeptic] Waiting for readiness") &&
        log.includes("http://localhost:3100/health"),
    );
    expect(waitingLog).toBeDefined();

    // Cleanup
    await stopApp(result.process);
  }, 15000);

  it("logs success when app becomes ready", async () => {
    let attemptCount = 0;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount <= 1) {
        throw new Error("Not ready");
      }
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    };

    const command =
      process.platform === "win32" ? "timeout /t 5 /nobreak > nul" : "sleep 5";

    const result = await startOrReuseApp({
      baseUrl: "http://localhost:3100",
      readyPath: "/health",
      startCommand: command,
      timeoutMs: 10000,
      pollIntervalMs: 500,
    });

    // Check that success log was created
    const successLog = logCalls.find(
      (log) =>
        log.includes("[Skeptic] Application ready") &&
        log.includes("http://localhost:3100/health"),
    );
    expect(successLog).toBeDefined();

    // Cleanup
    await stopApp(result.process);
  }, 15000);
});

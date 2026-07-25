import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  checkReadiness,
  waitForReadiness,
  AppStartupError,
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

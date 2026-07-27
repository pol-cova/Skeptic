import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { EvidenceStore } from "./evidence-store.ts";
import type { RunMetadata, CriterionVerdict } from "@skeptic/core";
import type { ScreenshotProvider } from "./interfaces.ts";

/**
 * Builds a valid RunMetadata object for integration tests.
 */
function makeRunMetadata(runId: string, artifactRoot = ""): RunMetadata {
  return {
    runId,
    startedAt: Date.now(),
    config: {
      app: {
        baseUrl: "http://localhost:3000",
        startCommand: "npm start",
        readyPath: "/health",
        allowedOrigins: ["http://localhost:3000"],
      },
      criteria: { file: "acceptance.md", maxCriteria: 3 },
    },
    criteria: [
      { index: 1, sourceText: "User can log in", prerequisites: [] },
      { index: 2, sourceText: "User can view dashboard", prerequisites: [] },
    ],
    artifactRoot,
  };
}

/**
 * Builds a set of CriterionVerdict entries for the test metadata.
 */
function makeVerdicts(): CriterionVerdict[] {
  return [
    {
      criterionIndex: 1,
      sourceText: "User can log in",
      verdict: "PASS",
      explanation: "Login works correctly",
    },
    {
      criterionIndex: 2,
      sourceText: "User can view dashboard",
      verdict: "FAIL",
      explanation: "Dashboard not found",
    },
  ];
}

describe("EvidenceStore integration: full lifecycle", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-integration-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("happy path with screenshot provider: initialize → append → finalize → read back", async () => {
    // Arrange: screenshot provider that returns a 1x1 PNG
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const capturedContexts: Array<{
      runId: string;
      criterionIndex: number;
      sequence: number;
    }> = [];

    const screenshotProvider: ScreenshotProvider = {
      capture: async (ctx) => {
        capturedContexts.push(ctx);
        return pngBytes;
      },
    };

    const store = new EvidenceStore({
      basePath: tempDir,
      screenshotProvider,
    });

    const metadata = makeRunMetadata("integration-test-001");

    // Act: Initialize
    const initResult = await store.initialize(metadata, []);
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const artifactRoot = initResult.artifactRoot;

    // Act: Append events
    const ev1 = await store.appendEvent({
      runId: "integration-test-001",
      timestamp: Date.now(),
      actor: "harness",
      type: "run.started",
      payload: { configPath: "./proof.config.ts", criteriaCount: 2 },
    });
    expect(ev1.ok).toBe(true);
    if (ev1.ok) expect(ev1.sequence).toBe(0);

    const ev2 = await store.appendEvent({
      runId: "integration-test-001",
      timestamp: Date.now(),
      actor: "agent",
      type: "browser.action",
      payload: { actionId: "click-login", actionType: "click" },
      criterionIndex: 1,
    });
    expect(ev2.ok).toBe(true);
    if (ev2.ok) expect(ev2.sequence).toBe(1);

    // This event should trigger screenshot capture
    const ev3 = await store.appendEvent({
      runId: "integration-test-001",
      timestamp: Date.now(),
      actor: "oracle",
      type: "assertion.checked",
      payload: { passed: true, assertionType: "text" },
      criterionIndex: 1,
    });
    expect(ev3.ok).toBe(true);
    if (ev3.ok) expect(ev3.sequence).toBe(2);

    // criterion.completed with FAIL should also trigger screenshot
    const ev4 = await store.appendEvent({
      runId: "integration-test-001",
      timestamp: Date.now(),
      actor: "oracle",
      type: "criterion.completed",
      payload: { verdict: "FAIL" },
      criterionIndex: 2,
    });
    expect(ev4.ok).toBe(true);
    if (ev4.ok) expect(ev4.sequence).toBe(3);

    // Act: Finalize
    const verdicts = makeVerdicts();
    const finalResult = await store.finalize(verdicts);

    // Assert: Finalize should succeed (bundle is valid)
    expect(finalResult.ok).toBe(true);
    if (finalResult.ok) {
      // Readiness: has FAIL → NOT_READY
      expect(finalResult.readiness).toBe("NOT_READY");
    }

    // Assert: Filesystem layout
    const runDir = artifactRoot;
    await expect(access(join(runDir, "screenshots"))).resolves.toBeUndefined();
    await expect(access(join(runDir, "traces"))).resolves.toBeUndefined();
    await expect(access(join(runDir, "network"))).resolves.toBeUndefined();
    await expect(
      access(join(runDir, "metadata.json")),
    ).resolves.toBeUndefined();
    await expect(access(join(runDir, "events.jsonl"))).resolves.toBeUndefined();

    // Assert: metadata.json is parseable
    const metadataRaw = await readFile(join(runDir, "metadata.json"), "utf-8");
    const metadataJson = JSON.parse(metadataRaw);
    expect(metadataJson.runId).toBe("integration-test-001");
    expect(metadataJson.finishedAt).toBeTypeOf("number");
    expect(metadataJson.readiness).toBe("NOT_READY");
    expect(metadataJson.verdicts).toHaveLength(2);

    await expect(access(join(runDir, "report.html"))).resolves.toBeUndefined();
    await expect(access(join(runDir, "report.md"))).resolves.toBeUndefined();
    const reportHtml = await readFile(join(runDir, "report.html"), "utf-8");
    expect(reportHtml).toContain("Skeptic Run Report");

    // Assert: events.jsonl is parseable (each line is valid JSON)
    const eventsRaw = await readFile(join(runDir, "events.jsonl"), "utf-8");
    const eventLines = eventsRaw.trim().split("\n");
    expect(eventLines.length).toBeGreaterThanOrEqual(4);
    for (const line of eventLines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty("runId");
      expect(parsed).toHaveProperty("sequence");
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("actor");
      expect(parsed).toHaveProperty("type");
      expect(parsed).toHaveProperty("payload");
    }

    // Assert: Screenshots were captured
    expect(capturedContexts).toHaveLength(2);
    expect(capturedContexts[0]!.sequence).toBe(2); // assertion.checked
    expect(capturedContexts[1]!.sequence).toBe(3); // criterion.completed FAIL

    // Assert: Screenshot files exist on disk
    const screenshots = await readdir(join(runDir, "screenshots"));
    expect(screenshots.length).toBeGreaterThanOrEqual(2);
    expect(screenshots).toContain("000002-1.png");
    expect(screenshots).toContain("000003-2.png");

    // Assert: network/observations.json is written
    const obsRaw = await readFile(
      join(runDir, "network", "observations.json"),
      "utf-8",
    );
    const observations = JSON.parse(obsRaw);
    expect(Array.isArray(observations)).toBe(true);
  });

  it("happy path without providers: runs lifecycle without screenshot or trace", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeRunMetadata("no-providers-run");

    // Initialize
    const initResult = await store.initialize(metadata, []);
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const artifactRoot = initResult.artifactRoot;

    // Append events
    await store.appendEvent({
      runId: "no-providers-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "run.started",
      payload: { configPath: "./proof.config.ts", criteriaCount: 2 },
    });

    await store.appendEvent({
      runId: "no-providers-run",
      timestamp: Date.now(),
      actor: "oracle",
      type: "assertion.checked",
      payload: { passed: true, assertionType: "text" },
      criterionIndex: 1,
    });

    await store.appendEvent({
      runId: "no-providers-run",
      timestamp: Date.now(),
      actor: "oracle",
      type: "criterion.completed",
      payload: { verdict: "PASS" },
      criterionIndex: 1,
    });

    // Finalize with all PASS verdicts
    const verdicts: CriterionVerdict[] = [
      {
        criterionIndex: 1,
        sourceText: "User can log in",
        verdict: "PASS",
        explanation: "Login works",
      },
      {
        criterionIndex: 2,
        sourceText: "User can view dashboard",
        verdict: "PASS",
        explanation: "Dashboard loads",
      },
    ];

    const finalResult = await store.finalize(verdicts);
    expect(finalResult.ok).toBe(true);
    if (finalResult.ok) {
      expect(finalResult.readiness).toBe("READY");
    }

    // Verify filesystem layout
    await expect(
      access(join(artifactRoot, "metadata.json")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "events.jsonl")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "screenshots")),
    ).resolves.toBeUndefined();
    await expect(access(join(artifactRoot, "traces"))).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "network")),
    ).resolves.toBeUndefined();

    // No screenshots should exist (no provider registered)
    const screenshots = await readdir(join(artifactRoot, "screenshots"));
    expect(screenshots).toHaveLength(0);

    // metadata.json readiness should be READY
    const metadataRaw = await readFile(
      join(artifactRoot, "metadata.json"),
      "utf-8",
    );
    const metadataJson = JSON.parse(metadataRaw);
    expect(metadataJson.readiness).toBe("READY");
    expect(metadataJson.finishedAt).toBeTypeOf("number");
  });

  it("secrets redaction: verifies metadata.json does not contain secret values", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const secretPassword = "super-secret-password-xyz";
    const secretUsername = "admin-user-abc";
    const metadata = makeRunMetadata("redaction-test-run");

    // Initialize with secrets
    const initResult = await store.initialize(metadata, [
      secretPassword,
      secretUsername,
    ]);
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const artifactRoot = initResult.artifactRoot;

    // Append an event whose payload contains a secret
    await store.appendEvent({
      runId: "redaction-test-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "run.started",
      payload: {
        configPath: "./proof.config.ts",
        criteriaCount: 2,
        note: `Logged in as ${secretUsername} with ${secretPassword}`,
      },
    });

    // Finalize
    const verdicts: CriterionVerdict[] = [
      {
        criterionIndex: 1,
        sourceText: "User can log in",
        verdict: "PASS",
        explanation: "Login works",
      },
      {
        criterionIndex: 2,
        sourceText: "User can view dashboard",
        verdict: "PASS",
        explanation: "Dashboard loads",
      },
    ];

    await store.finalize(verdicts);

    // Read events.jsonl and verify secrets are redacted
    const eventsRaw = await readFile(
      join(artifactRoot, "events.jsonl"),
      "utf-8",
    );
    expect(eventsRaw).not.toContain(secretPassword);
    expect(eventsRaw).not.toContain(secretUsername);
    expect(eventsRaw).toContain("[REDACTED]");

    // Read metadata.json and verify no secrets
    const metadataRaw = await readFile(
      join(artifactRoot, "metadata.json"),
      "utf-8",
    );
    expect(metadataRaw).not.toContain(secretPassword);
    expect(metadataRaw).not.toContain(secretUsername);
  });

  it("network observations: appends network.observed events and writes observations.json", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeRunMetadata("network-test-run");

    const initResult = await store.initialize(metadata, []);
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const artifactRoot = initResult.artifactRoot;

    // Append run.started
    await store.appendEvent({
      runId: "network-test-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "run.started",
      payload: { configPath: "./proof.config.ts", criteriaCount: 2 },
    });

    // Append network observations
    await store.appendEvent({
      runId: "network-test-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "network.observed",
      payload: { method: "POST", path: "/api/login", status: 200 },
    });

    await store.appendEvent({
      runId: "network-test-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "network.observed",
      payload: { method: "GET", path: "/api/dashboard", status: 404 },
    });

    await store.appendEvent({
      runId: "network-test-run",
      timestamp: Date.now(),
      actor: "harness",
      type: "network.observed",
      payload: { method: "GET", path: "/api/users", status: 200 },
    });

    // Finalize
    const verdicts: CriterionVerdict[] = [
      {
        criterionIndex: 1,
        sourceText: "User can log in",
        verdict: "PASS",
        explanation: "Login works",
      },
      {
        criterionIndex: 2,
        sourceText: "User can view dashboard",
        verdict: "FAIL",
        explanation: "Dashboard not found",
      },
    ];

    const finalResult = await store.finalize(verdicts);
    expect(finalResult.ok).toBe(true);

    // Verify observations.json exists and is parseable
    const obsPath = join(artifactRoot, "network", "observations.json");
    await expect(access(obsPath)).resolves.toBeUndefined();

    const obsRaw = await readFile(obsPath, "utf-8");
    const observations = JSON.parse(obsRaw);
    expect(Array.isArray(observations)).toBe(true);
    expect(observations).toHaveLength(3);
    expect(observations[0]).toEqual({
      method: "POST",
      path: "/api/login",
      status: 200,
    });
    expect(observations[1]).toEqual({
      method: "GET",
      path: "/api/dashboard",
      status: 404,
    });
    expect(observations[2]).toEqual({
      method: "GET",
      path: "/api/users",
      status: 200,
    });

    // Verify response assertion matching
    const passResult = store.matchResponseAssertion({
      method: "POST",
      path: "/api/login",
      status: 200,
    });
    expect(passResult.passed).toBe(true);

    const failResult = store.matchResponseAssertion({
      method: "DELETE",
      path: "/api/users/1",
      status: 200,
    });
    expect(failResult.passed).toBe(false);
    expect(failResult.observed).toBeDefined();
    expect(failResult.observed!.length).toBeLessThanOrEqual(10);
  });
});

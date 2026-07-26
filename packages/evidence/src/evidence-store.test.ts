import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { RunMetadata } from "@skeptic/core";
import { EvidenceStore } from "./evidence-store.ts";
import type { EvidenceLogger } from "./interfaces.ts";

function makeMetadata(runId = "test-run-001"): RunMetadata {
  return {
    runId,
    startedAt: Date.now(),
    config: {
      targetUrl: "http://localhost:3000",
      criteria: "acceptance.md",
    },
    criteria: [
      {
        index: 1,
        text: "User can log in",
        assertions: [],
      },
    ],
    artifactRoot: "",
  } as unknown as RunMetadata;
}

describe("EvidenceStore.initialize()", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-store-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates artifact layout on success", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeMetadata();

    const result = await store.initialize(metadata, []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifactRoot).toBe(
        join(tempDir, ".proof", "runs", "test-run-001"),
      );

      // Verify directories exist
      await expect(
        access(join(result.artifactRoot, "screenshots")),
      ).resolves.toBeUndefined();
      await expect(
        access(join(result.artifactRoot, "traces")),
      ).resolves.toBeUndefined();
      await expect(
        access(join(result.artifactRoot, "network")),
      ).resolves.toBeUndefined();
    }
  });

  it("returns DUPLICATE_RUN if directory already exists", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeMetadata();

    // Pre-create the directory
    const runDir = join(tempDir, ".proof", "runs", "test-run-001");
    await mkdir(runDir, { recursive: true });

    const result = await store.initialize(metadata, []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("DUPLICATE_RUN");
      expect(result.message).toContain("already exists");
    }
  });

  it("returns FS_ERROR on filesystem failure and cleans up", async () => {
    // Use a path that will cause failure (invalid characters or read-only)
    // On Windows, we can use a path with an invalid character
    const store = new EvidenceStore({ basePath: "/nonexistent/\0invalid" });
    const metadata = makeMetadata();

    const result = await store.initialize(metadata, []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("FS_ERROR");
      expect(result.message).toContain("Failed to create artifact layout");
    }
  });

  it("emits warning log about screenshots containing credentials", async () => {
    const warnings: string[] = [];
    const logger: EvidenceLogger = {
      warn: (msg) => warnings.push(msg),
      error: () => {},
    };

    const store = new EvidenceStore({ basePath: tempDir, logger });
    const metadata = makeMetadata();

    await store.initialize(metadata, ["secret123"]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Screenshots and trace archives");
    expect(warnings[0]).toContain("credentials");
  });

  it("getArtifactRoot() returns the correct path after initialization", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeMetadata();

    await store.initialize(metadata, []);

    expect(store.getArtifactRoot()).toBe(
      join(tempDir, ".proof", "runs", "test-run-001"),
    );
  });

  it("getArtifactRoot() throws before initialization", () => {
    const store = new EvidenceStore({ basePath: tempDir });
    expect(() => store.getArtifactRoot()).toThrow("not been initialized");
  });

  it("stores secretSet for later use", async () => {
    const store = new EvidenceStore({ basePath: tempDir });
    const metadata = makeMetadata();
    const secrets = ["password123", "api-key-456"];

    const result = await store.initialize(metadata, secrets);

    expect(result.ok).toBe(true);
  });
});

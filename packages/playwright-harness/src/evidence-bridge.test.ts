import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RunMetadata } from "@skeptic/core";
import { EvidenceStore } from "@skeptic/evidence";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createHarnessEvidenceProviders,
  HarnessEvidenceBridge,
} from "./evidence-bridge.ts";
import { PlaywrightHarness } from "./harness.ts";

function makeMetadata(runId: string): RunMetadata {
  return {
    runId,
    startedAt: Date.now(),
    config: {
      app: {
        baseUrl: "http://127.0.0.1:3100",
        startCommand: "pnpm demo:dev",
        readyPath: "/health",
        allowedOrigins: ["http://127.0.0.1:3100"],
      },
      auth: {
        loginPath: "/login",
        usernameEnv: "PROOF_TEST_USERNAME",
        passwordEnv: "PROOF_TEST_PASSWORD",
      },
      criteria: {
        file: "acceptance.md",
        maxCriteria: 3,
      },
    },
    criteria: [
      {
        index: 1,
        sourceText: "Example criterion",
        prerequisites: [],
      },
    ],
    artifactRoot: "",
  };
}

describe("HarnessEvidenceBridge", () => {
  let tempDir: string;
  let harness: PlaywrightHarness;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "evidence-bridge-test-"));
    harness = new PlaywrightHarness({
      allowedOrigins: ["http://127.0.0.1:3100"],
      headless: true,
    });
    await harness.launch();
  });

  afterEach(async () => {
    await harness.close();
    const { rm } = await import("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists network observations, screenshots, and trace for a criterion", async () => {
    const runId = "bridge-integration-001";
    const store = new EvidenceStore({
      basePath: tempDir,
      ...createHarnessEvidenceProviders(harness),
    });

    const init = await store.initialize(makeMetadata(runId), ["secret-password"]);
    expect(init.ok).toBe(true);
    if (!init.ok) {
      return;
    }

    const bridge = new HarnessEvidenceBridge(store, harness, runId);
    bridge.attach();

    await harness.page.goto("data:text/html,<html><body>ok</body></html>");

    const observation = await harness.observe();
    const verdict = await bridge.recordCriterionResult({
      observations: [observation],
      assertionResults: [
        {
          assertion: {
            type: "url",
            expected: "data:text/html,<html><body>ok</body></html>",
          },
          passed: true,
          expected: "data:text/html,<html><body>ok</body></html>",
          observed: "data:text/html,<html><body>ok</body></html>",
          timestamp: Date.now(),
        },
      ],
      verdict: {
        criterionIndex: 1,
        sourceText: "Example criterion",
        verdict: "PASS",
        explanation: "Deterministic assertions satisfied.",
      },
    });

    bridge.detach();

    const finalized = await store.finalize([verdict]);
    expect(finalized.ok).toBe(true);
    expect(finalized.readiness).not.toBe("ERROR");

    const artifactRoot = init.artifactRoot;
    await expect(
      access(join(artifactRoot, "events.jsonl")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "metadata.json")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "network", "observations.json")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(artifactRoot, "traces", "trace.zip")),
    ).resolves.toBeUndefined();

    const metadataRaw = await readFile(
      join(artifactRoot, "metadata.json"),
      "utf8",
    );
    expect(metadataRaw).not.toContain("secret-password");

    const screenshotDir = join(artifactRoot, "screenshots");
    const screenshots = await import("node:fs/promises").then((fs) =>
      fs.readdir(screenshotDir),
    );
    expect(screenshots.length).toBeGreaterThan(0);
    expect(verdict.artifactRefs?.length).toBeGreaterThan(0);
  });
});

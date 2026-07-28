import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  exitCodeFor,
  parseReplayFixture,
  startOrReuseApp,
  stopApp,
} from "@skeptic/core";
import { replayFixture } from "@skeptic/playwright-harness";

import {
  loadRunBundle,
  resolveRunLocation,
  RunArtifactError,
} from "./run-artifacts.ts";

export interface ReplayCommandOptions {
  runId?: string;
  latest?: boolean;
  artifactRoot?: string;
  headless?: boolean;
  cwd?: string;
}

export interface ReplayCommandResult {
  runId: string;
  readiness: Awaited<ReturnType<typeof replayFixture>>["readiness"];
  exitCode: 0 | 1 | 2 | 3;
  verdicts: Awaited<ReturnType<typeof replayFixture>>["verdicts"];
  modelCalls: number;
  artifactRoot: string;
}

export class ReplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayError";
  }
}

export async function runReplayCommand(
  options: ReplayCommandOptions,
): Promise<ReplayCommandResult> {
  const cwd = options.cwd ?? process.cwd();

  let location;
  try {
    location = await resolveRunLocation({
      runId: options.runId,
      latest: options.latest,
      artifactRoot: options.artifactRoot,
      cwd,
    });
  } catch (error) {
    throw new ReplayError(
      error instanceof RunArtifactError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error),
    );
  }

  const replayPath = join(location.artifactRoot, "replay.json");

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(replayPath, "utf8")) as unknown;
  } catch (error) {
    throw new ReplayError(
      `Replay fixture not found at ${replayPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const fixture = parseReplayFixture(raw);

  let criteria:
    | Awaited<ReturnType<typeof loadRunBundle>>["metadata"]["criteria"]
    | undefined;
  let appProcess = null;

  try {
    const bundle = await loadRunBundle(location.artifactRoot);
    criteria = bundle.metadata.criteria;

    const app = await startOrReuseApp({
      baseUrl: bundle.metadata.config.app.baseUrl,
      startCommand: bundle.metadata.config.app.startCommand,
      readyPath: bundle.metadata.config.app.readyPath,
      timeoutMs: 90_000,
      pollIntervalMs: 1_000,
      reuseExisting: true,
    });
    appProcess = app.process;
  } catch (error) {
    if (error instanceof RunArtifactError) {
      criteria = undefined;
    } else {
      throw new ReplayError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  try {
    const result = await replayFixture({
      fixture,
      headless: options.headless ?? true,
      criteria,
    });

    return {
      runId: location.runId,
      readiness: result.readiness,
      exitCode: exitCodeFor(result.readiness),
      verdicts: result.verdicts,
      modelCalls: result.modelCalls,
      artifactRoot: location.artifactRoot,
    };
  } finally {
    await stopApp(appProcess);
  }
}

export { resolveRunArtifactRoot } from "./run-artifacts.ts";

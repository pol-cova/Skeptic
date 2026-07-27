import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { exitCodeFor, parseReplayFixture } from "@skeptic/core";
import { replayFixture } from "@skeptic/playwright-harness";

export interface ReplayCommandOptions {
  runId: string;
  cwd?: string;
}

export interface ReplayCommandResult {
  runId: string;
  readiness: Awaited<ReturnType<typeof replayFixture>>["readiness"];
  exitCode: 0 | 1 | 2 | 3;
  verdicts: Awaited<ReturnType<typeof replayFixture>>["verdicts"];
  modelCalls: number;
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
  const artifactRoot = join(cwd, ".proof", "runs", options.runId);
  const replayPath = join(artifactRoot, "replay.json");

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(replayPath, "utf8")) as unknown;
  } catch (error) {
    throw new ReplayError(
      `Replay fixture not found at ${replayPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const fixture = parseReplayFixture(raw);
  const result = await replayFixture({ fixture });

  return {
    runId: options.runId,
    readiness: result.readiness,
    exitCode: exitCodeFor(result.readiness),
    verdicts: result.verdicts,
    modelCalls: result.modelCalls,
  };
}

export function resolveRunArtifactRoot(
  runId: string,
  cwd = process.cwd(),
): string {
  return resolve(cwd, ".proof", "runs", runId);
}

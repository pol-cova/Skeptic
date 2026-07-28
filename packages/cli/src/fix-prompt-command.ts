import { writeFixPrompt, renderFixPrompt } from "@skeptic/report";
import { join } from "node:path";

import {
  loadRunBundle,
  resolveRunLocation,
  RunArtifactError,
} from "./run-artifacts.ts";

export interface FixPromptCommandOptions {
  runId?: string;
  latest?: boolean;
  artifactRoot?: string;
  cwd?: string;
}

export interface FixPromptCommandResult {
  runId: string;
  fixPromptPath: string;
}

export class FixPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FixPromptError";
  }
}

export async function runFixPromptCommand(
  options: FixPromptCommandOptions,
): Promise<FixPromptCommandResult> {
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
    throw new FixPromptError(
      error instanceof RunArtifactError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error),
    );
  }

  const bundle = await loadRunBundle(location.artifactRoot);
  const written = await writeFixPrompt(bundle, {
    artifactRoot: location.artifactRoot,
  });

  if (written) {
    return {
      runId: location.runId,
      fixPromptPath: written.fixPromptPath,
    };
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const fixPromptPath = join(location.artifactRoot, "fix-prompt.md");
  await mkdir(location.artifactRoot, { recursive: true });
  await writeFile(fixPromptPath, renderFixPrompt(bundle), "utf8");

  return {
    runId: location.runId,
    fixPromptPath,
  };
}

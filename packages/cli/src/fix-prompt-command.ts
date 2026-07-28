import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  persistedRunBundleSchema,
  type PersistedRunBundle,
} from "@skeptic/core";
import { renderFixPrompt, writeFixPrompt } from "@skeptic/report";

import { resolveRunArtifactRoot } from "./replay-command.ts";

export interface FixPromptCommandOptions {
  runId: string;
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

async function loadRunBundle(
  artifactRoot: string,
): Promise<PersistedRunBundle> {
  const metadataPath = join(artifactRoot, "metadata.json");
  const eventsPath = join(artifactRoot, "events.jsonl");

  let metadataRaw: unknown;
  try {
    metadataRaw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
  } catch (error) {
    throw new FixPromptError(
      `Run metadata not found at ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let eventsContent: string;
  try {
    eventsContent = await readFile(eventsPath, "utf8");
  } catch (error) {
    throw new FixPromptError(
      `Run events not found at ${eventsPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const events = eventsContent
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PersistedRunBundle["events"][number]);

  return persistedRunBundleSchema.parse({
    metadata: metadataRaw,
    events,
  });
}

export async function runFixPromptCommand(
  options: FixPromptCommandOptions,
): Promise<FixPromptCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const artifactRoot = resolveRunArtifactRoot(options.runId, cwd);
  const bundle = await loadRunBundle(artifactRoot);
  const written = await writeFixPrompt(bundle, { artifactRoot });

  if (written) {
    return {
      runId: options.runId,
      fixPromptPath: written.fixPromptPath,
    };
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const fixPromptPath = join(artifactRoot, "fix-prompt.md");
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(fixPromptPath, renderFixPrompt(bundle), "utf8");

  return {
    runId: options.runId,
    fixPromptPath,
  };
}

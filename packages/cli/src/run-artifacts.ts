import { access, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  persistedRunBundleSchema,
  type PersistedRunBundle,
} from "@skeptic/core";

export class RunArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunArtifactError";
  }
}

export interface ResolveRunLocationOptions {
  runId?: string;
  latest?: boolean;
  artifactRoot?: string;
  cwd?: string;
}

export interface ResolvedRunLocation {
  runId: string;
  artifactRoot: string;
}

export async function resolveLatestRunId(cwd = process.cwd()): Promise<string> {
  const runsDir = join(cwd, ".proof", "runs");

  let entries: string[];
  try {
    entries = await readdir(runsDir);
  } catch {
    throw new RunArtifactError(`No runs found under ${runsDir}.`);
  }

  const runIds = entries.filter((entry) => entry.startsWith("verify-"));
  if (runIds.length === 0) {
    throw new RunArtifactError(`No verification runs found under ${runsDir}.`);
  }

  runIds.sort((left, right) => {
    const leftTs = Number(left.replace("verify-", ""));
    const rightTs = Number(right.replace("verify-", ""));
    return rightTs - leftTs;
  });

  return runIds[0]!;
}

export async function resolveRunLocation(
  options: ResolveRunLocationOptions,
): Promise<ResolvedRunLocation> {
  if (options.artifactRoot) {
    const artifactRoot = resolve(
      options.cwd ?? process.cwd(),
      options.artifactRoot,
    );
    const runId = options.runId ?? artifactRoot.split("/").pop() ?? "unknown";
    return { runId, artifactRoot };
  }

  const cwd = options.cwd ?? process.cwd();
  const runId =
    options.runId ??
    (options.latest ? await resolveLatestRunId(cwd) : undefined);

  if (!runId) {
    throw new RunArtifactError("Run ID is required when --latest is not set.");
  }

  return {
    runId,
    artifactRoot: join(cwd, ".proof", "runs", runId),
  };
}

export function resolveRunArtifactRoot(
  runId: string,
  cwd = process.cwd(),
): string {
  return resolve(cwd, ".proof", "runs", runId);
}

export async function loadRunBundle(
  artifactRoot: string,
): Promise<PersistedRunBundle> {
  const metadataPath = join(artifactRoot, "metadata.json");
  const eventsPath = join(artifactRoot, "events.jsonl");

  let metadataRaw: unknown;
  try {
    metadataRaw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
  } catch (error) {
    throw new RunArtifactError(
      `Run metadata not found at ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let eventsContent: string;
  try {
    eventsContent = await readFile(eventsPath, "utf8");
  } catch (error) {
    throw new RunArtifactError(
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

export async function discoverTracePath(
  artifactRoot: string,
): Promise<string | undefined> {
  const tracePath = join(artifactRoot, "traces", "trace.zip");
  try {
    await access(tracePath);
    return "traces/trace.zip";
  } catch {
    return undefined;
  }
}

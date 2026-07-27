import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  persistedRunBundleSchema,
  type PersistedRunBundle,
} from "@skeptic/core";
import { writeRunReports } from "@skeptic/report";

const execFileAsync = promisify(execFile);

export interface ReportCommandOptions {
  runId: string;
  open?: boolean;
  cwd?: string;
}

export interface ReportCommandResult {
  runId: string;
  htmlPath: string;
  markdownPath: string;
}

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
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
    throw new ReportError(
      `Run metadata not found at ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let eventsContent: string;
  try {
    eventsContent = await readFile(eventsPath, "utf8");
  } catch (error) {
    throw new ReportError(
      `Run events not found at ${eventsPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const events = eventsContent
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PersistedRunBundle["events"][number]);

  const bundle = persistedRunBundleSchema.parse({
    metadata: metadataRaw,
    events,
  });

  return bundle;
}

async function openInBrowser(filePath: string): Promise<void> {
  const platform = process.platform;
  if (platform === "darwin") {
    await execFileAsync("open", [filePath]);
    return;
  }
  if (platform === "win32") {
    await execFileAsync("cmd", ["/c", "start", "", filePath]);
    return;
  }
  await execFileAsync("xdg-open", [filePath]);
}

export async function runReportCommand(
  options: ReportCommandOptions,
): Promise<ReportCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const artifactRoot = join(cwd, ".proof", "runs", options.runId);
  const bundle = await loadRunBundle(artifactRoot);
  const paths = await writeRunReports(bundle, { artifactRoot });

  if (options.open) {
    await openInBrowser(paths.htmlPath);
  }

  return {
    runId: options.runId,
    htmlPath: paths.htmlPath,
    markdownPath: paths.markdownPath,
  };
}

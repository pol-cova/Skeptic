import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { writeRunReports } from "@skeptic/report";

import {
  discoverTracePath,
  loadRunBundle,
  resolveRunLocation,
  RunArtifactError,
} from "./run-artifacts.ts";

const execFileAsync = promisify(execFile);

export interface ReportCommandOptions {
  runId?: string;
  latest?: boolean;
  artifactRoot?: string;
  open?: boolean;
  cwd?: string;
}

export interface ReportCommandResult {
  runId: string;
  htmlPath: string;
  markdownPath: string;
  tracePath?: string;
}

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
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

  let location;
  try {
    location = await resolveRunLocation({
      runId: options.runId,
      latest: options.latest,
      artifactRoot: options.artifactRoot,
      cwd,
    });
  } catch (error) {
    throw new ReportError(
      error instanceof RunArtifactError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error),
    );
  }

  const bundle = await loadRunBundle(location.artifactRoot);
  const tracePath = await discoverTracePath(location.artifactRoot);
  const paths = await writeRunReports(bundle, {
    artifactRoot: location.artifactRoot,
    tracePath,
  });

  if (options.open) {
    await openInBrowser(paths.htmlPath);
  }

  return {
    runId: location.runId,
    htmlPath: paths.htmlPath,
    markdownPath: paths.markdownPath,
    tracePath,
  };
}

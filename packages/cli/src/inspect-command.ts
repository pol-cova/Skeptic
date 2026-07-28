import { resolve } from "node:path";

import {
  discoverProofConfigPath,
  loadProofConfig,
  startOrReuseApp,
  stopApp,
} from "@skeptic/core";
import { PlaywrightHarness } from "@skeptic/playwright-harness";

export interface InspectCommandOptions {
  configPath?: string;
  url?: string;
  headless?: boolean;
  cwd?: string;
}

export interface InspectCommandResult {
  configPath: string;
  url: string;
  observation: Awaited<ReturnType<PlaywrightHarness["observe"]>>;
}

export class InspectError extends Error {
  readonly category: "config" | "environment" | "harness";

  constructor(
    category: "config" | "environment" | "harness",
    message: string,
  ) {
    super(message);
    this.name = "InspectError";
    this.category = category;
  }
}

export async function runInspectCommand(
  options: InspectCommandOptions,
): Promise<InspectCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const configPath =
    options.configPath ?? (await discoverProofConfigPath(cwd));

  if (!configPath) {
    throw new InspectError(
      "config",
      "No proof.config.ts or skeptic.config.ts found in the current directory. Pass --config <path>.",
    );
  }

  let config;
  try {
    config = await loadProofConfig(resolve(cwd, configPath));
  } catch (error) {
    throw new InspectError(
      "config",
      error instanceof Error ? error.message : String(error),
    );
  }

  const targetUrl =
    options.url ??
    `${config.app.baseUrl}${config.auth?.loginPath ?? "/"}`;

  let appProcess = null;
  try {
    const app = await startOrReuseApp({
      baseUrl: config.app.baseUrl,
      startCommand: config.app.startCommand,
      readyPath: config.app.readyPath,
      timeoutMs: 90_000,
      pollIntervalMs: 1_000,
      reuseExisting: true,
    });
    appProcess = app.process;
  } catch (error) {
    throw new InspectError(
      "environment",
      `App failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const harness = new PlaywrightHarness({
    allowedOrigins: [...config.app.allowedOrigins],
    headless: options.headless ?? true,
  });

  try {
    await harness.launch();
    await harness.execute({
      actionId: "inspect-goto",
      type: "goto",
      url: targetUrl,
    });
    const observation = await harness.observe();

    return {
      configPath,
      url: targetUrl,
      observation,
    };
  } catch (error) {
    throw new InspectError(
      "harness",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await harness.close();
    await stopApp(appProcess);
  }
}

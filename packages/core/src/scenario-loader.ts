import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseReplayFixture, type ReplayFixture } from "./schemas/replay.ts";

export interface ScenarioBuildContext {
  baseUrl: string;
  allowedOrigins: readonly string[];
  username: string;
  password: string;
  runId: string;
  loginPath: string;
  variables?: Record<string, string>;
}

export interface ScenarioModule {
  buildScenario(context: ScenarioBuildContext): ReplayFixture;
}

export class ScenarioLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioLoadError";
  }
}

export async function resolveScenarioModulePath(
  configDir: string,
  modulePath = "./scenario.ts",
): Promise<string> {
  const absolutePath = resolve(configDir, modulePath);
  try {
    await access(absolutePath);
  } catch {
    throw new ScenarioLoadError(
      `Scenario module not found at ${absolutePath}. ` +
        `Add scenario.module to proof.config.ts or create ${modulePath} exporting buildScenario().`,
    );
  }

  return absolutePath;
}

export async function loadScenarioModule(
  modulePath: string,
): Promise<ScenarioModule> {
  const loaded = (await import(pathToFileURL(modulePath).href)) as {
    buildScenario?: (context: ScenarioBuildContext) => unknown;
  };

  if (typeof loaded.buildScenario !== "function") {
    throw new ScenarioLoadError(
      `Scenario module ${modulePath} must export buildScenario(context).`,
    );
  }

  return {
    buildScenario(context: ScenarioBuildContext): ReplayFixture {
      return parseReplayFixture(loaded.buildScenario!(context));
    },
  };
}

export function resolvePrerequisiteMap(
  config: { prerequisites?: Record<string, number[]> },
  fallback: Readonly<Record<number, readonly number[]>> = {},
): Readonly<Record<number, readonly number[]>> {
  if (!config.prerequisites) {
    return fallback;
  }

  const mapped: Record<number, readonly number[]> = {};
  for (const [key, value] of Object.entries(config.prerequisites)) {
    mapped[Number(key)] = value;
  }
  return mapped;
}

import { pathToFileURL } from "node:url";

import { parseProofConfig } from "./config.ts";
import type { ProofConfig } from "./config.schema.ts";

export async function loadProofConfig(
  configPath: string,
): Promise<ProofConfig> {
  const moduleUrl = pathToFileURL(configPath).href;
  const loaded = await import(moduleUrl);
  const candidate = loaded.default ?? loaded.config;

  if (candidate === undefined) {
    throw new Error(
      `Proof config at ${configPath} must export a default config object.`,
    );
  }

  return parseProofConfig(candidate);
}

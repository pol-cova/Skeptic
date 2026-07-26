#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const cliIndex = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../packages/cli/src/index.ts",
);

const { runCli } = await import(pathToFileURL(cliIndex).href);
process.exitCode = await runCli(process.argv);

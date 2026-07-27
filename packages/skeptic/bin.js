#!/usr/bin/env node
import { runCli } from "./dist/skeptic.mjs";

process.exitCode = await runCli(process.argv);

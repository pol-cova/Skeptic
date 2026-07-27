#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { Command } from "commander";

import { listInitProviders, runInitCommand } from "./init-command.ts";
import { runReplayCommand } from "./replay-command.ts";
import { runReportCommand } from "./report-command.ts";
import { runVerify, VerifyError } from "./verify-runner.ts";
import { skepticProviderIds } from "@skeptic/core";

function printError(prefix: string, message: string): void {
  console.error(`${prefix}: ${message}`);
}

export async function runCli(argv: string[]): Promise<number> {
  let exitCode = 0;

  const program = new Command();

  program
    .name("skeptic")
    .description("Skeptic verification CLI")
    .version("0.1.0");

  program
    .command("init")
    .description(
      "Select a model provider and validate required credentials without storing secrets",
    )
    .option("--provider <id>", `Provider id (${skepticProviderIds.join(", ")})`)
    .action((options: { provider?: string }) => {
      try {
        const result = runInitCommand(
          options.provider
            ? {
                provider:
                  options.provider as (typeof skepticProviderIds)[number],
              }
            : {},
        );

        console.log(
          JSON.stringify(
            {
              provider: result.provider,
              modelId: result.modelId,
              credentialSource: result.credentialSource,
              setup: result.setup,
              validated: result.validated,
              providers: listInitProviders(),
            },
            null,
            2,
          ),
        );

        exitCode = result.validated ? 0 : 2;
      } catch (error) {
        printError(
          "Init error",
          error instanceof Error ? error.message : String(error),
        );
        exitCode = 3;
      }
    });

  program
    .command("verify")
    .description("Verify acceptance criteria against a running app")
    .requiredOption("--config <path>", "Path to proof.config.ts")
    .option(
      "--deterministic",
      "Use scripted verification paths (no model calls)",
      true,
    )
    .option("--no-deterministic", "Disable deterministic verification")
    .action(async (options: { config: string; deterministic: boolean }) => {
      try {
        const result = await runVerify({
          configPath: options.config,
          deterministic: options.deterministic,
        });

        console.log(
          JSON.stringify(
            {
              runId: result.runId,
              readiness: result.readiness,
              exitCode: result.exitCode,
              verdicts: result.verdicts.map((entry) => ({
                criterionIndex: entry.criterionIndex,
                verdict: entry.verdict,
              })),
              artifactRoot: result.artifactRoot,
            },
            null,
            2,
          ),
        );

        exitCode = result.exitCode;
      } catch (error) {
        if (error instanceof VerifyError) {
          const prefix =
            error.category === "config"
              ? "Configuration error"
              : error.category === "environment"
                ? "Environment error"
                : "Harness error";
          printError(prefix, error.message);
        } else {
          printError(
            "Harness error",
            error instanceof Error ? error.message : String(error),
          );
        }
        exitCode = 3;
      }
    });

  program
    .command("replay")
    .description("Replay a prior run without model calls")
    .requiredOption("--run <run-id>", "Run ID under .proof/runs/")
    .action(async (options: { run: string }) => {
      try {
        const result = await runReplayCommand({ runId: options.run });

        console.log(
          JSON.stringify(
            {
              runId: result.runId,
              readiness: result.readiness,
              exitCode: result.exitCode,
              modelCalls: result.modelCalls,
              verdicts: result.verdicts.map((entry) => ({
                criterionIndex: entry.criterionIndex,
                verdict: entry.verdict,
              })),
            },
            null,
            2,
          ),
        );

        exitCode = result.exitCode;
      } catch (error) {
        printError(
          "Replay error",
          error instanceof Error ? error.message : String(error),
        );
        exitCode = 3;
      }
    });

  program
    .command("report")
    .description("Regenerate HTML/Markdown reports for a prior run")
    .requiredOption("--run <run-id>", "Run ID under .proof/runs/")
    .option("--open", "Open the HTML report in a browser")
    .action(async (options: { run: string; open?: boolean }) => {
      try {
        const result = await runReportCommand({
          runId: options.run,
          open: options.open,
        });

        console.log(
          JSON.stringify(
            {
              runId: result.runId,
              htmlPath: result.htmlPath,
              markdownPath: result.markdownPath,
            },
            null,
            2,
          ),
        );

        exitCode = 0;
      } catch (error) {
        printError(
          "Report error",
          error instanceof Error ? error.message : String(error),
        );
        exitCode = 3;
      }
    });

  await program.parseAsync(argv);
  return exitCode;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const code = await runCli(process.argv);
  process.exitCode = code;
}

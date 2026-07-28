#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { Command } from "commander";

import { listInitProviders, runInitCommand } from "./init-command.ts";
import { runFixPromptCommand } from "./fix-prompt-command.ts";
import { scaffoldProject } from "./scaffold-init.ts";
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
      "Scaffold proof.config.ts, scenario.ts, and acceptance.md in the current directory",
    )
    .option(
      "--provider <id>",
      `Optional: validate agent provider (${skepticProviderIds.join(", ")})`,
    )
    .option("--force", "Overwrite existing scaffold files", false)
    .action(async (options: { provider?: string; force?: boolean }) => {
      try {
        const scaffold = await scaffoldProject({ force: options.force });

        const providerResult = options.provider
          ? runInitCommand({
              provider: options.provider as (typeof skepticProviderIds)[number],
            })
          : null;

        console.log(
          JSON.stringify(
            {
              scaffold,
              provider: providerResult,
              providers: options.provider ? listInitProviders() : undefined,
              nextSteps: [
                "Set PROOF_TEST_USERNAME and PROOF_TEST_PASSWORD for your app",
                "Adjust selectors in scenario.ts to match your UI",
                "Run: skeptic verify --config proof.config.ts --deterministic",
              ],
            },
            null,
            2,
          ),
        );

        if (providerResult && !providerResult.validated) {
          exitCode = 2;
        } else if (
          scaffold.created.length === 0 &&
          scaffold.skipped.length > 0
        ) {
          exitCode = 2;
        } else {
          exitCode = 0;
        }
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

        const payload: Record<string, unknown> = {
          runId: result.runId,
          readiness: result.readiness,
          exitCode: result.exitCode,
          verdicts: result.verdicts.map((entry) => ({
            criterionIndex: entry.criterionIndex,
            verdict: entry.verdict,
          })),
          artifactRoot: result.artifactRoot,
        };

        if (result.fixPromptPath) {
          payload.fixPromptPath = result.fixPromptPath;
        }

        console.log(JSON.stringify(payload, null, 2));

        if (result.exitCode !== 0 && result.fixPromptPath) {
          console.error(`Fix prompt: ${result.fixPromptPath}`);
        }

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

  program
    .command("fix-prompt")
    .description(
      "Generate or regenerate fix-prompt.md for a prior run (for coding agents)",
    )
    .requiredOption("--run <run-id>", "Run ID under .proof/runs/")
    .action(async (options: { run: string }) => {
      try {
        const result = await runFixPromptCommand({ runId: options.run });

        console.log(
          JSON.stringify(
            {
              runId: result.runId,
              fixPromptPath: result.fixPromptPath,
            },
            null,
            2,
          ),
        );

        exitCode = 0;
      } catch (error) {
        printError(
          "Fix prompt error",
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

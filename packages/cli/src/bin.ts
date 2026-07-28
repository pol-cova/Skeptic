#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { Command } from "commander";
import { discoverProofConfigPath, skepticProviderIds } from "@skeptic/core";

import { runFixPromptCommand } from "./fix-prompt-command.ts";
import { runInspectCommand, InspectError } from "./inspect-command.ts";
import { listInitProviders, runInitCommand } from "./init-command.ts";
import { runReplayCommand } from "./replay-command.ts";
import { runReportCommand } from "./report-command.ts";
import { scaffoldProject } from "./scaffold-init.ts";
import { runValidateCommand, ValidateError } from "./validate-command.ts";
import { runVerify, VerifyError } from "./verify-runner.ts";
import { formatStructuredError, formatVerifyPayload } from "./verify-output.ts";

function readCliVersion(): string {
  try {
    const packageRoot = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "skeptic",
    );
    const manifest = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { version?: string };
    return manifest.version ?? "0.0.0";
  } catch {
    return "0.2.0";
  }
}

function printError(prefix: string, message: string): void {
  console.error(`${prefix}: ${message}`);
}

function runTargetOptions(options: {
  run?: string;
  latest?: boolean;
  artifactRoot?: string;
}) {
  if (options.run || options.latest || options.artifactRoot) {
    return options;
  }

  return { ...options, latest: true };
}

async function resolveConfigPath(config?: string): Promise<string> {
  if (config) {
    return config;
  }

  const discovered = await discoverProofConfigPath();
  if (!discovered) {
    throw new VerifyError(
      "config",
      "No proof.config.ts or skeptic.config.ts found. Pass --config <path>.",
    );
  }

  return discovered;
}

export async function runCli(argv: string[]): Promise<number> {
  let exitCode = 0;

  const program = new Command();

  program
    .name("skeptic")
    .description("Skeptic verification CLI")
    .version(readCliVersion());

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
                "Run: skeptic validate",
                "Run: skeptic verify --deterministic",
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
    .command("validate")
    .description(
      "Validate proof.config.ts, acceptance.md, and scenario.ts without running the browser",
    )
    .option("--config <path>", "Path to proof.config.ts")
    .option("--check-app", "Probe app.readyPath over the network", false)
    .option("--no-check-auth", "Skip credential environment variable checks")
    .action(
      async (options: {
        config?: string;
        checkApp?: boolean;
        checkAuth?: boolean;
      }) => {
        try {
          const result = await runValidateCommand({
            configPath: options.config,
            checkApp: options.checkApp,
            checkAuth: options.checkAuth !== false,
          });

          console.log(JSON.stringify(result, null, 2));
          exitCode = result.exitCode;
        } catch (error) {
          if (error instanceof ValidateError) {
            console.log(
              JSON.stringify(
                formatStructuredError("config", error.message),
                null,
                2,
              ),
            );
            printError("Validation error", error.message);
          } else {
            printError(
              "Validation error",
              error instanceof Error ? error.message : String(error),
            );
          }
          exitCode = 3;
        }
      },
    );

  program
    .command("inspect")
    .description(
      "Capture accessible elements from a page to help author scenario.ts selectors",
    )
    .option("--config <path>", "Path to proof.config.ts")
    .option("--url <url>", "Page URL to inspect (defaults to loginPath)")
    .option("--headed", "Run browser in headed mode", false)
    .action(
      async (options: { config?: string; url?: string; headed?: boolean }) => {
        try {
          const result = await runInspectCommand({
            configPath: options.config,
            url: options.url,
            headless: !options.headed,
          });

          console.log(JSON.stringify(result, null, 2));
          exitCode = 0;
        } catch (error) {
          if (error instanceof InspectError) {
            console.log(
              JSON.stringify(
                formatStructuredError(error.category, error.message),
                null,
                2,
              ),
            );
            printError(`${error.category} error`, error.message);
          } else {
            printError(
              "Inspect error",
              error instanceof Error ? error.message : String(error),
            );
          }
          exitCode = 3;
        }
      },
    );

  program
    .command("verify")
    .description("Verify acceptance criteria against a running app")
    .option("--config <path>", "Path to proof.config.ts")
    .option(
      "--deterministic",
      "Use scripted verification paths (no model calls)",
      true,
    )
    .option("--no-deterministic", "Disable deterministic verification")
    .option("--headed", "Run browser in headed mode", false)
    .option("--compact-json", "Emit minimal verify JSON output", false)
    .action(
      async (options: {
        config?: string;
        deterministic: boolean;
        headed?: boolean;
        compactJson?: boolean;
      }) => {
        try {
          const configPath = await resolveConfigPath(options.config);
          const result = await runVerify({
            configPath,
            deterministic: options.deterministic,
            headless: !options.headed,
          });

          const payload = formatVerifyPayload(result, {
            verbose: !options.compactJson,
          });

          console.log(JSON.stringify(payload, null, 2));

          if (result.exitCode !== 0 && result.fixPromptPath) {
            console.error(`Fix prompt: ${result.fixPromptPath}`);
          }

          exitCode = result.exitCode;
        } catch (error) {
          if (error instanceof VerifyError) {
            console.log(
              JSON.stringify(
                formatStructuredError(error.category, error.message),
                null,
                2,
              ),
            );
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
      },
    );

  program
    .command("replay")
    .description("Replay a prior run without model calls")
    .option("--run <run-id>", "Run ID under .proof/runs/")
    .option("--latest", "Replay the most recent verification run")
    .option(
      "--artifact-root <path>",
      "Path to a downloaded run artifact directory",
    )
    .option("--headed", "Run browser in headed mode", false)
    .action(
      async (options: {
        run?: string;
        latest?: boolean;
        artifactRoot?: string;
        headed?: boolean;
      }) => {
        try {
          const result = await runReplayCommand({
            ...runTargetOptions(options),
            headless: !options.headed,
          });

          console.log(
            JSON.stringify(
              {
                runId: result.runId,
                readiness: result.readiness,
                exitCode: result.exitCode,
                modelCalls: result.modelCalls,
                artifactRoot: result.artifactRoot,
                verdicts: result.verdicts.map((entry) => ({
                  criterionIndex: entry.criterionIndex,
                  verdict: entry.verdict,
                  explanation: entry.explanation,
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
      },
    );

  program
    .command("report")
    .description("Regenerate HTML/Markdown reports for a prior run")
    .option("--run <run-id>", "Run ID under .proof/runs/")
    .option("--latest", "Report the most recent verification run")
    .option(
      "--artifact-root <path>",
      "Path to a downloaded run artifact directory",
    )
    .option("--open", "Open the HTML report in a browser")
    .action(
      async (options: {
        run?: string;
        latest?: boolean;
        artifactRoot?: string;
        open?: boolean;
      }) => {
        try {
          const result = await runReportCommand({
            ...runTargetOptions(options),
            open: options.open,
          });

          console.log(JSON.stringify(result, null, 2));
          exitCode = 0;
        } catch (error) {
          printError(
            "Report error",
            error instanceof Error ? error.message : String(error),
          );
          exitCode = 3;
        }
      },
    );

  program
    .command("fix-prompt")
    .description(
      "Generate or regenerate fix-prompt.md for a prior run (for coding agents)",
    )
    .option("--run <run-id>", "Run ID under .proof/runs/")
    .option("--latest", "Use the most recent verification run")
    .option(
      "--artifact-root <path>",
      "Path to a downloaded run artifact directory",
    )
    .action(
      async (options: {
        run?: string;
        latest?: boolean;
        artifactRoot?: string;
      }) => {
        try {
          const result = await runFixPromptCommand(runTargetOptions(options));

          console.log(JSON.stringify(result, null, 2));
          exitCode = 0;
        } catch (error) {
          printError(
            "Fix prompt error",
            error instanceof Error ? error.message : String(error),
          );
          exitCode = 3;
        }
      },
    );

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

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { startOrReuseApp, stopApp } from "@skeptic/core";
import { chromium } from "@playwright/test";

import { runReplayCommand } from "../../packages/cli/src/replay-command.ts";
import { runVerify } from "../../packages/cli/src/verify-runner.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const SUBMISSION_ROOT = join(REPO_ROOT, "submission");
const FALLBACK_ROOT = join(SUBMISSION_ROOT, "fallback");
const ASSETS_ROOT = join(SUBMISSION_ROOT, "assets");
const EVIDENCE_ROOT = join(SUBMISSION_ROOT, "evidence");

const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

interface RunSummary {
  runId: string;
  readiness: string;
  exitCode: number;
  verdicts: Array<{ criterionIndex: number; verdict: string }>;
  artifactRoot: string;
  durationMs: number;
}

async function killPort(port: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  if (process.platform !== "win32") {
    try {
      await execFileAsync("fuser", ["-k", `${port}/tcp`]);
    } catch {
      // Port already free or fuser unavailable.
    }
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-ti", `:${port}`]);
    for (const pid of stdout.trim().split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // Process already exited.
      }
    }
  } catch {
    // Port already free.
  }
}

async function captureReportScreenshot(
  htmlPath: string,
  pngPath: string,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
}

async function copyRunBundle(
  sourceRoot: string,
  targetDir: string,
): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const files = [
    "metadata.json",
    "events.jsonl",
    "replay.json",
    "report.html",
    "report.md",
  ] as const;

  for (const file of files) {
    await cp(join(sourceRoot, file), join(targetDir, file));
  }

  await cp(join(sourceRoot, "generated"), join(targetDir, "generated"), {
    recursive: true,
  });

  try {
    await cp(join(sourceRoot, "screenshots"), join(targetDir, "screenshots"), {
      recursive: true,
    });
  } catch {
    // Screenshots are optional for the offline bundle.
  }
}

function summarizeVerify(
  result: Awaited<ReturnType<typeof runVerify>>,
  startedAt: number,
): RunSummary {
  return {
    runId: result.runId,
    readiness: result.readiness,
    exitCode: result.exitCode,
    verdicts: result.verdicts.map((entry) => ({
      criterionIndex: entry.criterionIndex,
      verdict: entry.verdict,
    })),
    artifactRoot: result.artifactRoot,
    durationMs: Date.now() - startedAt,
  };
}

async function runBrokenVerify(): Promise<RunSummary> {
  process.env.DEMO_PERSIST_INVITATIONS = "false";
  const startedAt = Date.now();
  const result = await runVerify({
    configPath: "examples/demo-app/proof.config.ts",
    deterministic: true,
    cwd: REPO_ROOT,
  });
  return summarizeVerify(result, startedAt);
}

async function runFixedVerify(): Promise<RunSummary> {
  process.env.DEMO_PERSIST_INVITATIONS = "true";
  const startedAt = Date.now();
  const result = await runVerify({
    configPath: "examples/demo-app/proof.config.fixed.ts",
    deterministic: true,
    cwd: REPO_ROOT,
  });
  return summarizeVerify(result, startedAt);
}

async function runReplayOnFixedDemo(brokenRunId: string): Promise<{
  modelCalls: number;
  readiness: string;
  exitCode: number;
  verdicts: Array<{ criterionIndex: number; verdict: string }>;
}> {
  process.env.DEMO_PERSIST_INVITATIONS = "true";
  await killPort("3100");
  const app = await startOrReuseApp({
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app exec next dev --port 3100",
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
    env: {
      ...process.env,
      DEMO_PERSIST_INVITATIONS: "true",
    },
    reuseExisting: false,
  });

  try {
    const replay = await runReplayCommand({
      runId: brokenRunId,
      cwd: REPO_ROOT,
    });
    return {
      modelCalls: replay.modelCalls,
      readiness: replay.readiness,
      exitCode: replay.exitCode,
      verdicts: replay.verdicts.map((entry) => ({
        criterionIndex: entry.criterionIndex,
        verdict: entry.verdict,
      })),
    };
  } finally {
    await stopApp(app.process);
  }
}

async function runThreeConsecutive(): Promise<RunSummary[]> {
  const consecutive: RunSummary[] = [];
  await killPort("3100");
  await killPort("3101");
  for (let index = 0; index < 3; index += 1) {
    consecutive.push(await runBrokenVerify());
  }
  return consecutive;
}

async function main(): Promise<void> {
  process.env.PROOF_TEST_USERNAME = DEMO_USERNAME;
  process.env.PROOF_TEST_PASSWORD = DEMO_PASSWORD;

  await mkdir(SUBMISSION_ROOT, { recursive: true });
  await mkdir(ASSETS_ROOT, { recursive: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const broken = await runBrokenVerify();
  await copyRunBundle(broken.artifactRoot, join(FALLBACK_ROOT, "broken"));
  await killPort("3100");

  const fixed = await runFixedVerify();
  await copyRunBundle(fixed.artifactRoot, join(FALLBACK_ROOT, "fixed"));
  await killPort("3100");
  await killPort("3101");

  const replay = await runReplayOnFixedDemo(broken.runId);
  await writeFile(
    join(FALLBACK_ROOT, "replay-three-pass.json"),
    JSON.stringify(
      {
        disclaimer:
          "Replay output from skeptic replay using the broken-run replay.json against the fixed demo app. Zero model calls.",
        sourceRunId: broken.runId,
        ...replay,
      },
      null,
      2,
    ),
    "utf8",
  );

  const consecutive = await runThreeConsecutive();

  await captureReportScreenshot(
    join(FALLBACK_ROOT, "broken", "report.html"),
    join(ASSETS_ROOT, "report-broken.png"),
  );
  await captureReportScreenshot(
    join(FALLBACK_ROOT, "fixed", "report.html"),
    join(ASSETS_ROOT, "report-fixed.png"),
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    broken,
    fixed,
    replay,
    consecutiveRuns: consecutive,
    freshClone: {
      commands: [
        "git clone https://github.com/pol-cova/Skeptic.git && cd Skeptic",
        "pnpm install",
        "pnpm demo:dev",
      ],
      verifyCommand:
        "PROOF_TEST_USERNAME=demo PROOF_TEST_PASSWORD=skeptic-demo pnpm skeptic verify --config examples/demo-app/proof.config.ts --deterministic",
      documentedPlatform: "macOS / Linux with Node.js 24 and pnpm 10.7",
    },
  };

  await writeFile(
    join(EVIDENCE_ROOT, "submission-evidence.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  await writeFile(
    join(FALLBACK_ROOT, "manifest.json"),
    JSON.stringify(
      {
        ...manifest,
        disclaimer:
          "Prerecorded artifacts for offline judging. Open report.html directly in a browser. Replay requires a running demo app and must be labeled as replay, not a live agent run.",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify(manifest, null, 2));
}

await main();

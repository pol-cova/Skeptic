/**
 * Demo app integration gate — proves MVP safety, bounded behavior, and repeatable verify flows.
 * Runs broken/fixed verify, replay, consecutive runs, and bundle integrity checks against examples/demo-app.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { startOrReuseApp, stopApp } from "@skeptic/core";

import { runReplayCommand } from "../../packages/cli/src/replay-command.ts";
import { runVerify } from "../../packages/cli/src/verify-runner.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const MAX_RUN_SECONDS = 120;
const DEMO_USERNAME = process.env.PROOF_TEST_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo";

interface GateFailure {
  check: string;
  detail: string;
}

const failures: GateFailure[] = [];

function fail(check: string, detail: string): void {
  failures.push({ check, detail });
  console.error(`FAIL [${check}]: ${detail}`);
}

function pass(check: string): void {
  console.log(`PASS [${check}]`);
}

function verdictSequence(
  result: Awaited<ReturnType<typeof runVerify>>,
): string[] {
  return result.verdicts.map((entry) => entry.verdict);
}

async function assertNoSecretsInBundle(artifactRoot: string): Promise<void> {
  const metadata = await readFile(join(artifactRoot, "metadata.json"), "utf8");
  const events = await readFile(join(artifactRoot, "events.jsonl"), "utf8");
  const combined = `${metadata}\n${events}`;

  if (combined.includes(DEMO_PASSWORD)) {
    fail("secrets-redaction", "Password appeared in persisted bundle output.");
    return;
  }

  if (/sk-[A-Za-z0-9]{10,}/.test(combined)) {
    fail("secrets-redaction", "API key pattern appeared in persisted output.");
    return;
  }

  pass("secrets-redaction");
}

async function assertPassFailHaveEvidence(
  artifactRoot: string,
  result: Awaited<ReturnType<typeof runVerify>>,
): Promise<void> {
  for (const verdict of result.verdicts) {
    if (verdict.verdict !== "PASS" && verdict.verdict !== "FAIL") {
      continue;
    }

    if (!verdict.assertionResults || verdict.assertionResults.length === 0) {
      fail(
        "assertion-evidence",
        `Criterion ${verdict.criterionIndex} ${verdict.verdict} lacks assertions.`,
      );
      continue;
    }

    if (!verdict.artifactRefs || verdict.artifactRefs.length === 0) {
      fail(
        "assertion-evidence",
        `Criterion ${verdict.criterionIndex} ${verdict.verdict} lacks artifact refs.`,
      );
    }
  }

  const metadata = JSON.parse(
    await readFile(join(artifactRoot, "metadata.json"), "utf8"),
  ) as { readiness?: string };

  if (metadata.readiness === "ERROR") {
    fail(
      "bundle-validation",
      `Bundle validation failed — readiness ERROR for ${artifactRoot}.`,
    );
    return;
  }

  pass("assertion-evidence");
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

async function main(): Promise<void> {
  process.env.PROOF_TEST_USERNAME = DEMO_USERNAME;
  process.env.PROOF_TEST_PASSWORD = DEMO_PASSWORD;

  console.log("=== Day 4 Golden Gate ===\n");

  // --- Broken demo ---
  process.env.DEMO_PERSIST_INVITATIONS = "false";
  const brokenStarted = Date.now();
  const broken = await runVerify({
    configPath: "examples/demo-app/proof.config.ts",
    deterministic: true,
    cwd: REPO_ROOT,
  });
  const brokenDurationMs = Date.now() - brokenStarted;

  if (verdictSequence(broken).join(",") !== "PASS,FAIL,UNVERIFIABLE") {
    fail(
      "broken-verdicts",
      `Expected PASS,FAIL,UNVERIFIABLE — got ${verdictSequence(broken).join(",")}.`,
    );
  } else {
    pass("broken-verdicts");
  }

  if (broken.readiness !== "NOT_READY" || broken.exitCode !== 1) {
    fail(
      "broken-readiness",
      `Expected NOT_READY/exit 1 — got ${broken.readiness}/exit ${broken.exitCode}.`,
    );
  } else {
    pass("broken-readiness");
  }

  if (brokenDurationMs > MAX_RUN_SECONDS * 1000) {
    fail(
      "broken-duration",
      `Broken run took ${brokenDurationMs}ms (limit ${MAX_RUN_SECONDS}s).`,
    );
  } else {
    pass("broken-duration");
  }

  await assertNoSecretsInBundle(broken.artifactRoot);
  await assertPassFailHaveEvidence(broken.artifactRoot, broken);
  await killPort("3100");

  // --- Fixed demo ---
  process.env.DEMO_PERSIST_INVITATIONS = "true";
  const fixedStarted = Date.now();
  const fixed = await runVerify({
    configPath: "examples/demo-app/proof.config.fixed.ts",
    deterministic: true,
    cwd: REPO_ROOT,
  });
  const fixedDurationMs = Date.now() - fixedStarted;

  if (verdictSequence(fixed).join(",") !== "PASS,PASS,PASS") {
    fail(
      "fixed-verdicts",
      `Expected three PASS — got ${verdictSequence(fixed).join(",")}.`,
    );
  } else {
    pass("fixed-verdicts");
  }

  if (fixed.readiness !== "READY" || fixed.exitCode !== 0) {
    fail(
      "fixed-readiness",
      `Expected READY/exit 0 — got ${fixed.readiness}/exit ${fixed.exitCode}.`,
    );
  } else {
    pass("fixed-readiness");
  }

  if (fixedDurationMs > MAX_RUN_SECONDS * 1000) {
    fail(
      "fixed-duration",
      `Fixed run took ${fixedDurationMs}ms (limit ${MAX_RUN_SECONDS}s).`,
    );
  } else {
    pass("fixed-duration");
  }

  await assertNoSecretsInBundle(fixed.artifactRoot);
  await killPort("3100");
  await killPort("3101");

  // --- Replay broken fixture on fixed app (zero model calls) ---
  const replayApp = await startOrReuseApp({
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app exec next dev --port 3100",
    readyPath: "/health",
    timeoutMs: 90_000,
    pollIntervalMs: 1_000,
    env: { ...process.env, DEMO_PERSIST_INVITATIONS: "true" },
    reuseExisting: false,
  });

  try {
    const replay = await runReplayCommand({
      runId: broken.runId,
      cwd: REPO_ROOT,
    });

    if (replay.modelCalls !== 0) {
      fail(
        "replay-model-calls",
        `Expected 0 model calls — got ${replay.modelCalls}.`,
      );
    } else {
      pass("replay-model-calls");
    }

    const replayVerdicts = replay.verdicts
      .map((entry) => entry.verdict)
      .join(",");
    if (replayVerdicts !== "PASS,PASS,PASS") {
      fail(
        "replay-verdicts",
        `Expected three PASS on fixed app — got ${replayVerdicts}.`,
      );
    } else {
      pass("replay-verdicts");
    }

    if (replay.readiness !== "READY" || replay.exitCode !== 0) {
      fail(
        "replay-readiness",
        `Expected READY/exit 0 — got ${replay.readiness}/exit ${replay.exitCode}.`,
      );
    } else {
      pass("replay-readiness");
    }
  } finally {
    await stopApp(replayApp.process);
  }

  // --- Three consecutive broken runs ---
  await killPort("3100");
  await killPort("3101");
  process.env.DEMO_PERSIST_INVITATIONS = "false";
  const consecutive: Array<{
    readiness: string;
    exitCode: number;
    verdicts: string[];
    durationMs: number;
  }> = [];

  for (let index = 0; index < 3; index += 1) {
    const started = Date.now();
    const result = await runVerify({
      configPath: "examples/demo-app/proof.config.ts",
      deterministic: true,
      cwd: REPO_ROOT,
    });
    consecutive.push({
      readiness: result.readiness,
      exitCode: result.exitCode,
      verdicts: verdictSequence(result),
      durationMs: Date.now() - started,
    });
  }

  const firstReadiness = consecutive[0]?.readiness;
  const allSameReadiness = consecutive.every(
    (run) => run.readiness === firstReadiness,
  );
  const allSameVerdicts = consecutive.every(
    (run) => run.verdicts.join(",") === "PASS,FAIL,UNVERIFIABLE",
  );
  const allUnderLimit = consecutive.every(
    (run) => run.durationMs <= MAX_RUN_SECONDS * 1000,
  );

  if (!allSameReadiness || firstReadiness !== "NOT_READY") {
    fail(
      "consecutive-readiness",
      `Expected identical NOT_READY — got ${consecutive.map((r) => r.readiness).join(", ")}.`,
    );
  } else {
    pass("consecutive-readiness");
  }

  if (!allSameVerdicts) {
    fail(
      "consecutive-verdicts",
      "Verdict sequences differ across consecutive runs.",
    );
  } else {
    pass("consecutive-verdicts");
  }

  if (!allUnderLimit) {
    fail(
      "consecutive-duration",
      `Runs exceeded ${MAX_RUN_SECONDS}s: ${consecutive.map((r) => r.durationMs).join(", ")}ms.`,
    );
  } else {
    pass("consecutive-duration");
  }

  // --- Report accessibility (non-color-only indicators) ---
  const reportHtml = await readFile(
    join(broken.artifactRoot, "report.html"),
    "utf8",
  );
  if (
    !reportHtml.includes("Skip to main content") ||
    !reportHtml.includes('aria-label="Verdict')
  ) {
    fail("report-accessibility", "Report missing keyboard/a11y markers.");
  } else {
    pass("report-accessibility");
  }

  console.log("\n=== Gate Summary ===");
  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        broken: {
          runId: broken.runId,
          readiness: broken.readiness,
          exitCode: broken.exitCode,
          verdicts: verdictSequence(broken),
          durationMs: brokenDurationMs,
        },
        fixed: {
          runId: fixed.runId,
          readiness: fixed.readiness,
          exitCode: fixed.exitCode,
          verdicts: verdictSequence(fixed),
          durationMs: fixedDurationMs,
        },
        consecutiveRuns: consecutive,
      },
      null,
      2,
    ),
  );
}

await main();

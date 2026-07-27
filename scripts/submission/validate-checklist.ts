import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const SUBMISSION_ROOT = join(REPO_ROOT, "submission");

const REQUIRED_PATHS = [
  "submission/README.md",
  "submission/demo-script.md",
  "submission/narrative.md",
  "submission/checklist.md",
  "submission/assets/architecture.svg",
  "submission/assets/report-broken.png",
  "submission/assets/report-fixed.png",
  "submission/fallback/README.md",
  "submission/fallback/broken/report.html",
  "submission/fallback/broken/metadata.json",
  "submission/fallback/broken/replay.json",
  "submission/fallback/fixed/report.html",
  "submission/fallback/fixed/metadata.json",
  "submission/fallback/replay-three-pass.json",
  "submission/evidence/submission-evidence.json",
  "LICENSE",
  "README.md",
  ".kiro/README.md",
] as const;

async function pathExists(relativePath: string): Promise<boolean> {
  try {
    await access(join(REPO_ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const missing: string[] = [];

  for (const relativePath of REQUIRED_PATHS) {
    if (!(await pathExists(relativePath))) {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    console.error("Missing submission assets:");
    for (const entry of missing) {
      console.error(`  - ${entry}`);
    }
    process.exitCode = 1;
    return;
  }

  const evidence = JSON.parse(
    await readFile(join(SUBMISSION_ROOT, "evidence/submission-evidence.json"), "utf8"),
  ) as {
    broken: { verdicts: Array<{ verdict: string }> };
    fixed: { verdicts: Array<{ verdict: string }> };
    replay: { modelCalls: number; verdicts: Array<{ verdict: string }> };
    consecutiveRuns: Array<{ verdicts: Array<{ verdict: string }> }>;
  };

  const brokenVerdicts = evidence.broken.verdicts.map((entry) => entry.verdict);
  const fixedVerdicts = evidence.fixed.verdicts.map((entry) => entry.verdict);
  const replayVerdicts = evidence.replay.verdicts.map((entry) => entry.verdict);

  const checks = [
    {
      name: "broken demo verdict sequence",
      pass:
        brokenVerdicts[0] === "PASS" &&
        brokenVerdicts[1] === "FAIL" &&
        brokenVerdicts[2] === "UNVERIFIABLE",
    },
    {
      name: "fixed demo three passes",
      pass: fixedVerdicts.every((verdict) => verdict === "PASS"),
    },
    {
      name: "replay has zero model calls",
      pass: evidence.replay.modelCalls === 0,
    },
    {
      name: "replay produces three passes on fixed app",
      pass: replayVerdicts.every((verdict) => verdict === "PASS"),
    },
    {
      name: "three consecutive runs agree on verdict sequence",
      pass:
        evidence.consecutiveRuns.length === 3 &&
        evidence.consecutiveRuns.every(
          (run) =>
            run.verdicts.map((entry) => entry.verdict).join(",") ===
            "PASS,FAIL,UNVERIFIABLE",
        ),
    },
  ];

  const failed = checks.filter((check) => !check.pass);
  if (failed.length > 0) {
    console.error("Submission evidence checks failed:");
    for (const check of failed) {
      console.error(`  - ${check.name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedPaths: REQUIRED_PATHS.length,
        evidenceChecks: checks.length,
      },
      null,
      2,
    ),
  );
}

await main();

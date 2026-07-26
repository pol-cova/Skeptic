import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  exitCodeFor,
  readinessFor,
  resolveAuthSecrets,
  secretValuesFromAuth,
  type RunMetadata,
} from "@skeptic/core";
import { EvidenceStore } from "@skeptic/evidence";
import {
  CRITERION_2_TEXT,
  runDay1GateWithHarness,
} from "@skeptic/playwright-harness";

const BASE_URL = process.env.PROOF_BASE_URL ?? "http://127.0.0.1:3100";
const ALLOWED_ORIGINS = [BASE_URL];
const PERSISTENCE_FIXED = process.env.DEMO_PERSIST_INVITATIONS === "true";

async function main(): Promise<void> {
  const runId = `day1-gate-${Date.now()}`;
  const authConfig = {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  } as const;
  const auth = resolveAuthSecrets(authConfig);

  const metadata: RunMetadata = {
    runId,
    startedAt: Date.now(),
    config: {
      app: {
        baseUrl: BASE_URL,
        startCommand: "pnpm --filter demo-app dev",
        readyPath: "/health",
        allowedOrigins: ALLOWED_ORIGINS,
      },
      auth: authConfig,
      criteria: {
        file: "examples/demo-app/acceptance.md",
        maxCriteria: 3,
      },
    },
    criteria: [
      {
        index: 2,
        sourceText: CRITERION_2_TEXT,
        prerequisites: [1],
      },
    ],
    artifactRoot: "",
  };

  const store = new EvidenceStore({
    screenshotProvider: {
      capture: async () => new Uint8Array(),
    },
  });

  const init = await store.initialize(
    metadata,
    secretValuesFromAuth(authConfig),
  );
  if (!init.ok) {
    throw new Error(`Evidence init failed: ${init.message}`);
  }

  await store.appendEvent({
    runId,
    timestamp: Date.now(),
    actor: "harness",
    type: "run.started",
    payload: {
      configPath: "scripts/gate/day1.ts",
      criteriaCount: 1,
    },
  });

  const gate = await runDay1GateWithHarness({
    baseUrl: BASE_URL,
    allowedOrigins: ALLOWED_ORIGINS,
    username: auth.username,
    password: auth.password,
  });

  for (const observation of gate.observations) {
    await store.appendEvent({
      runId,
      timestamp: Date.now(),
      actor: "harness",
      type: "page.observed",
      payload: observation,
      criterionIndex: 2,
    });
  }

  for (const assertionResult of gate.assertionResults) {
    await store.appendEvent({
      runId,
      timestamp: Date.now(),
      actor: "oracle",
      type: "assertion.checked",
      payload: assertionResult,
      criterionIndex: 2,
    });
  }

  const artifactRoot = init.artifactRoot;
  await mkdir(join(artifactRoot, "screenshots"), { recursive: true });
  await writeFile(
    join(artifactRoot, "screenshots", "000001-2.png"),
    gate.screenshots.afterSubmit,
  );
  await writeFile(
    join(artifactRoot, "screenshots", "000002-2.png"),
    gate.screenshots.afterReload,
  );

  await store.appendEvent({
    runId,
    timestamp: Date.now(),
    actor: "oracle",
    type: "criterion.completed",
    payload: {
      verdict: gate.verdict.verdict,
      explanation: gate.verdict.explanation,
    },
    criterionIndex: 2,
    artifactRefs: gate.artifactRefs,
  });

  const finalized = await store.finalize([gate.verdict]);
  const readiness = finalized.readiness;
  const reportPath = join(artifactRoot, "report.html");
  await writeFile(
    reportPath,
    renderHtmlReport(gate.verdict.verdict, gate.verdict.explanation, runId),
    "utf8",
  );

  const summary = {
    runId,
    readiness,
    exitCode: exitCodeFor(readiness),
    expectedVerdict: PERSISTENCE_FIXED ? "PASS" : "FAIL",
    verdict: gate.verdict.verdict,
    artifactRoot,
    reportPath,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (gate.verdict.verdict !== summary.expectedVerdict) {
    process.exitCode = exitCodeFor(readiness);
  } else {
    process.exitCode = exitCodeFor(readinessFor([gate.verdict.verdict]));
  }
}

function renderHtmlReport(
  verdict: string,
  explanation: string,
  runId: string,
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Skeptic Day 1 Gate</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      .verdict { font-size: 1.5rem; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Day 1 Gate</h1>
    <p class="verdict">${verdict}</p>
    <p>${explanation}</p>
    <p>Run: ${runId}</p>
    <ul>
      <li><a href="screenshots/000001-2.png">Screenshot after submit</a></li>
      <li><a href="screenshots/000002-2.png">Screenshot after reload</a></li>
      <li><a href="events.jsonl">Events</a></li>
      <li><a href="metadata.json">Metadata</a></li>
    </ul>
  </body>
</html>`;
}

await main();

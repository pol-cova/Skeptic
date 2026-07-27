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
  createHarnessEvidenceProviders,
  HarnessEvidenceBridge,
  PlaywrightHarness,
  runDay1Gate,
} from "@skeptic/playwright-harness";
import { writeRunReports } from "@skeptic/report";

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

  const harness = new PlaywrightHarness({
    allowedOrigins: ALLOWED_ORIGINS,
    headless: true,
  });

  await harness.launch();

  const store = new EvidenceStore({
    ...createHarnessEvidenceProviders(harness),
  });

  const init = await store.initialize(
    metadata,
    secretValuesFromAuth(authConfig),
  );
  if (!init.ok) {
    await harness.close();
    throw new Error(`Evidence init failed: ${init.message}`);
  }

  const bridge = new HarnessEvidenceBridge(store, harness, runId);
  bridge.attach();

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

  const gate = await runDay1Gate(harness, {
    baseUrl: BASE_URL,
    allowedOrigins: ALLOWED_ORIGINS,
    username: auth.username,
    password: auth.password,
  });

  const verdict = await bridge.recordCriterionResult({
    observations: gate.observations,
    assertionResults: gate.assertionResults,
    verdict: gate.verdict,
  });

  bridge.detach();

  const finalized = await store.finalize([verdict]);
  const readiness = finalized.readiness;
  const artifactRoot = init.artifactRoot;

  await writeRunReports(finalized.bundle, { artifactRoot });

  const reportPath = join(artifactRoot, "report.html");
  const summary = {
    runId,
    readiness,
    exitCode: exitCodeFor(readiness),
    expectedVerdict: PERSISTENCE_FIXED ? "PASS" : "FAIL",
    verdict: verdict.verdict,
    artifactRoot,
    reportPath,
    tracePath: join(artifactRoot, "traces", "trace.zip"),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (verdict.verdict !== summary.expectedVerdict) {
    process.exitCode = exitCodeFor(readiness);
  } else {
    process.exitCode = exitCodeFor(readinessFor([verdict.verdict]));
  }

  await harness.close();
}

await main();

import { dirname, join, resolve } from "node:path";

import {
  executeRunPlan,
  exitCodeFor,
  loadCriteriaFromFile,
  loadProofConfig,
  readinessFor,
  resolveAuthSecrets,
  secretValuesFromAuth,
  startOrReuseApp,
  stopApp,
  withPrerequisites,
  type CriterionVerdict,
  type ProofConfig,
  type RunMetadata,
} from "@skeptic/core";
import { EvidenceStore } from "@skeptic/evidence";
import {
  buildDemoReplayFixture,
  generatePlaywrightSpec,
  runCriterion1WithHarness,
  runCriterion3WithHarness,
  runDay1GateWithHarness,
} from "@skeptic/playwright-harness";
import { writeRunReports } from "@skeptic/report";

export interface VerifyOptions {
  configPath: string;
  deterministic?: boolean;
  headless?: boolean;
  cwd?: string;
}

export interface VerifyResult {
  runId: string;
  readiness: ReturnType<typeof readinessFor>;
  exitCode: 0 | 1 | 2 | 3;
  verdicts: CriterionVerdict[];
  artifactRoot: string;
}

export class VerifyError extends Error {
  readonly category: "config" | "environment" | "harness";

  constructor(category: "config" | "environment" | "harness", message: string) {
    super(message);
    this.name = "VerifyError";
    this.category = category;
  }
}

function resolveConfigDir(configPath: string, cwd: string): string {
  return dirname(resolve(cwd, configPath));
}

export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.configPath);
  const configDir = resolveConfigDir(configPath, cwd);

  let config: ProofConfig;
  try {
    config = await loadProofConfig(configPath);
  } catch (error) {
    throw new VerifyError(
      "config",
      error instanceof Error ? error.message : String(error),
    );
  }

  let criteria;
  try {
    criteria = loadCriteriaFromFile(config.criteria, {
      baseDir: configDir,
    }).criteria;
  } catch (error) {
    throw new VerifyError(
      "config",
      error instanceof Error ? error.message : String(error),
    );
  }

  const criteriaWithPrereqs = withPrerequisites(criteria, { 3: [2] });

  let auth: { username: string; password: string };
  if (config.auth) {
    try {
      auth = resolveAuthSecrets(config.auth);
    } catch (error) {
      throw new VerifyError(
        "environment",
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    throw new VerifyError(
      "config",
      "Proof config requires auth credentials for deterministic verification.",
    );
  }

  let appProcess = null;
  try {
    const app = await startOrReuseApp({
      baseUrl: config.app.baseUrl,
      startCommand: config.app.startCommand,
      readyPath: config.app.readyPath,
      timeoutMs: 90_000,
      pollIntervalMs: 1_000,
      reuseExisting: true,
    });
    appProcess = app.process;
  } catch (error) {
    throw new VerifyError(
      "environment",
      `App failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const runId = `verify-${Date.now()}`;
  const inviteEmail = `verify-${runId}@example.com`;

  const metadata: RunMetadata = {
    runId,
    startedAt: Date.now(),
    config,
    criteria: criteriaWithPrereqs,
    artifactRoot: "",
  };

  const store = new EvidenceStore({
    basePath: cwd,
    screenshotProvider: {
      capture: async () => new Uint8Array(),
    },
  });

  const init = await store.initialize(
    metadata,
    secretValuesFromAuth(config.auth),
  );

  if (!init.ok) {
    await stopApp(appProcess);
    throw new VerifyError("harness", init.message);
  }

  const artifactRoot = init.artifactRoot;

  await store.appendEvent({
    runId,
    timestamp: Date.now(),
    actor: "system",
    type: "run.started",
    payload: {
      configPath: options.configPath,
      deterministic: options.deterministic ?? true,
      criteriaCount: criteriaWithPrereqs.length,
    },
  });

  let planResult;
  try {
    planResult = await executeRunPlan({
      criteria: criteriaWithPrereqs,
      context: {
        credentialAvailability: {
          username: auth.username,
          password: auth.password,
        },
      },
      async executeCriterion(criterion) {
        if (criterion.index === 1) {
          const result = await runCriterion1WithHarness({
            baseUrl: config.app.baseUrl,
            username: auth.username,
            password: auth.password,
          });
          return { verdict: result.verdict };
        }

        if (criterion.index === 2) {
          const result = await runDay1GateWithHarness({
            baseUrl: config.app.baseUrl,
            allowedOrigins: config.app.allowedOrigins,
            username: auth.username,
            password: auth.password,
            inviteEmail,
            headless: options.headless,
            requirePersistedRow: true,
          });
          return { verdict: result.verdict };
        }

        const result = await runCriterion3WithHarness({
          baseUrl: config.app.baseUrl,
          username: auth.username,
          password: auth.password,
          inviteEmail,
        });
        return { verdict: result.verdict };
      },
    });
  } catch (error) {
    await stopApp(appProcess);
    throw new VerifyError(
      "harness",
      error instanceof Error ? error.message : String(error),
    );
  }

  for (const verdict of planResult.verdicts) {
    await store.appendEvent({
      runId,
      timestamp: Date.now(),
      actor: "oracle",
      type: "criterion.completed",
      payload: {
        verdict: verdict.verdict,
        explanation: verdict.explanation,
      },
      criterionIndex: verdict.criterionIndex,
      artifactRefs: verdict.artifactRefs,
    });
  }

  const replayFixture = buildDemoReplayFixture({
    baseUrl: config.app.baseUrl,
    allowedOrigins: config.app.allowedOrigins,
    username: auth.username,
    password: auth.password,
    inviteEmail,
  });

  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(join(artifactRoot, "generated"), { recursive: true });
  await writeFile(
    join(artifactRoot, "replay.json"),
    JSON.stringify(replayFixture, null, 2),
    "utf8",
  );
  await writeFile(
    join(artifactRoot, "generated", "acceptance.spec.ts"),
    generatePlaywrightSpec(replayFixture),
    "utf8",
  );

  const finalized = await store.finalize(planResult.verdicts);
  const readiness = finalized.readiness;
  const bundle = finalized.bundle;

  await writeRunReports(bundle, { artifactRoot });

  await stopApp(appProcess);

  return {
    runId,
    readiness,
    exitCode: exitCodeFor(readiness),
    verdicts: planResult.verdicts,
    artifactRoot,
  };
}

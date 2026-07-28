import { dirname, join, resolve } from "node:path";

import {
  executeRunPlan,
  exitCodeFor,
  loadCriteriaFromFile,
  loadProofConfig,
  loadScenarioModule,
  readinessFor,
  resolveAuthSecrets,
  resolveLoopLimits,
  resolvePrerequisiteMap,
  resolveScenarioModulePath,
  resolveSkepticModel,
  secretValuesFromAuth,
  startOrReuseApp,
  stopApp,
  withPrerequisites,
  type CriterionVerdict,
  type ProofConfig,
  type ReplayFixture,
  type RunMetadata,
} from "@skeptic/core";
import { EvidenceStore } from "@skeptic/evidence";
import {
  createHarnessEvidenceProviders,
  executeAgentCriterion,
  executeScenarioCriterion,
  generatePlaywrightSpec,
  HarnessEvidenceBridge,
  PlaywrightHarness,
} from "@skeptic/playwright-harness";

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
  fixPromptPath?: string;
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

async function loadScenarioFixture(
  config: ProofConfig,
  configDir: string,
  auth: { username: string; password: string },
  runId: string,
) {
  const scenarioModulePath = await resolveScenarioModulePath(
    configDir,
    config.scenario?.module ?? "./scenario.ts",
  );
  const scenarioModule = await loadScenarioModule(scenarioModulePath);

  return scenarioModule.buildScenario({
    baseUrl: config.app.baseUrl,
    allowedOrigins: config.app.allowedOrigins,
    username: auth.username,
    password: auth.password,
    runId,
    loginPath: config.auth?.loginPath ?? "/login",
    variables: {
      INVITE_EMAIL: `verify-${runId}@example.com`,
    },
  });
}

export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.configPath);
  const configDir = resolveConfigDir(configPath, cwd);
  const deterministic = options.deterministic ?? true;

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

  const criteriaWithPrereqs = withPrerequisites(
    criteria,
    resolvePrerequisiteMap(config),
  );

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
      deterministic
        ? "Proof config requires auth credentials for deterministic verification."
        : "Proof config requires auth credentials for agent verification.",
    );
  }

  if (!deterministic) {
    try {
      resolveSkepticModel();
    } catch (error) {
      throw new VerifyError(
        "environment",
        error instanceof Error ? error.message : String(error),
      );
    }
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

  let replayFixture: ReplayFixture | undefined;
  if (deterministic) {
    try {
      replayFixture = await loadScenarioFixture(config, configDir, auth, runId);
    } catch (error) {
      await stopApp(appProcess);
      throw new VerifyError(
        "config",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const metadata: RunMetadata = {
    runId,
    startedAt: Date.now(),
    config,
    criteria: criteriaWithPrereqs,
    artifactRoot: "",
  };

  const harness = new PlaywrightHarness({
    allowedOrigins: [...config.app.allowedOrigins],
    headless: options.headless ?? true,
  });

  await harness.launch();

  const store = new EvidenceStore({
    basePath: cwd,
    ...createHarnessEvidenceProviders(harness),
  });

  const init = await store.initialize(
    metadata,
    secretValuesFromAuth(config.auth),
  );

  if (!init.ok) {
    await harness.close();
    await stopApp(appProcess);
    throw new VerifyError("harness", init.message);
  }

  const artifactRoot = init.artifactRoot;
  const bridge = new HarnessEvidenceBridge(store, harness, runId);
  bridge.attach();

  await store.appendEvent({
    runId,
    timestamp: Date.now(),
    actor: "system",
    type: "run.started",
    payload: {
      configPath: options.configPath,
      deterministic,
      mode: deterministic ? "deterministic" : "agent",
      criteriaCount: criteriaWithPrereqs.length,
      scenarioModule: deterministic
        ? (config.scenario?.module ?? "./scenario.ts")
        : undefined,
    },
  });

  const loopLimits = resolveLoopLimits(config);
  const resolvedModel = deterministic ? undefined : resolveSkepticModel();

  let planResult;
  const priorVerdicts = new Map<number, CriterionVerdict>();

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
        const verdict = deterministic
          ? await executeScenarioCriterion(
              harness,
              bridge,
              replayFixture!,
              criterion,
              priorVerdicts,
            )
          : await executeAgentCriterion(
              harness,
              bridge,
              criterion,
              priorVerdicts,
              {
                model: resolvedModel!.model,
                limits: loopLimits,
                config,
                auth,
                runId,
                store,
              },
            );
        priorVerdicts.set(criterion.index, verdict);
        return { verdict };
      },
    });
  } catch (error) {
    bridge.detach();
    await harness.close();
    await stopApp(appProcess);
    throw new VerifyError(
      "harness",
      error instanceof Error ? error.message : String(error),
    );
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(join(artifactRoot, "generated"), { recursive: true });

  if (deterministic && replayFixture) {
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
  } else {
    await writeFile(
      join(artifactRoot, "replay.json"),
      JSON.stringify(
        {
          version: 1,
          mode: "agent",
          baseUrl: config.app.baseUrl,
          allowedOrigins: config.app.allowedOrigins,
          criteria: criteriaWithPrereqs.map((criterion) => ({
            criterionIndex: criterion.index,
            sourceText: criterion.sourceText,
          })),
          generatedAt: Date.now(),
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      join(artifactRoot, "generated", "acceptance.spec.ts"),
      [
        "// Agent verification run — no deterministic replay fixture was recorded.",
        "// Codify successful agent flows in scenario.ts, then rerun with --deterministic.",
        "import { test } from '@playwright/test';",
        "",
        "test.skip('agent run — export scenario.ts from evidence before replay', () => {});",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  bridge.detach();
  const finalized = await store.finalize(planResult.verdicts);
  const readiness = finalized.readiness;
  await harness.close();
  await stopApp(appProcess);

  return {
    runId,
    readiness,
    exitCode: exitCodeFor(readiness),
    verdicts: planResult.verdicts,
    artifactRoot,
    fixPromptPath: finalized.fixPromptPath,
  };
}

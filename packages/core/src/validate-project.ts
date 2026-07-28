import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { checkReadiness } from "./app-lifecycle.ts";
import { loadProofConfig } from "./load-config.ts";
import {
  loadCriteriaFromFile,
  withPrerequisites,
} from "./criteria.ts";
import {
  loadScenarioModule,
  resolvePrerequisiteMap,
  resolveScenarioModulePath,
} from "./scenario-loader.ts";
import { resolveAuthSecrets } from "./secrets.ts";
import type { ProofConfig } from "./config.schema.ts";
import type { BrowserAction, ReplayFixture } from "./schemas/index.ts";

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}

export interface ValidateProjectOptions {
  configPath: string;
  cwd?: string;
  checkApp?: boolean;
  checkAuth?: boolean;
}

export interface ValidateProjectResult {
  ok: boolean;
  configPath: string;
  configDir: string;
  criteriaCount: number;
  scenarioModule: string;
  issues: ValidationIssue[];
}

const PLACEHOLDER_AUTH = {
  username: "skeptic-validate-user",
  password: "skeptic-validate-password",
};

function resolveConfigDir(configPath: string, cwd: string): string {
  return dirname(resolve(cwd, configPath));
}

function collectActionIds(
  fixture: ReplayFixture,
): Map<string, { criterionIndex: number; count: number }[]> {
  const actionIds = new Map<string, { criterionIndex: number; count: number }[]>();

  for (const criterion of fixture.criteria) {
    const seenInCriterion = new Map<string, number>();
    for (const step of criterion.steps) {
      seenInCriterion.set(
        step.actionId,
        (seenInCriterion.get(step.actionId) ?? 0) + 1,
      );
    }

    for (const [actionId, count] of seenInCriterion) {
      const locations = actionIds.get(actionId) ?? [];
      locations.push({ criterionIndex: criterion.criterionIndex, count });
      actionIds.set(actionId, locations);
    }
  }

  return actionIds;
}

function validateScenarioAlignment(
  criteria: readonly { index: number; sourceText: string }[],
  fixture: ReplayFixture,
  issues: ValidationIssue[],
): void {
  const scenarioByIndex = new Map(
    fixture.criteria.map((entry) => [entry.criterionIndex, entry]),
  );

  for (const criterion of criteria) {
    const scenarioEntry = scenarioByIndex.get(criterion.index);
    if (!scenarioEntry) {
      issues.push({
        level: "error",
        code: "scenario.missing-criterion",
        message: `acceptance.md criterion ${criterion.index} has no matching block in scenario.ts.`,
        path: `criteria[${criterion.index}]`,
      });
      continue;
    }

    const hasAssertion = scenarioEntry.steps.some(
      (step: BrowserAction) => step.type === "assert",
    );
    if (!hasAssertion) {
      issues.push({
        level: "error",
        code: "scenario.missing-assertion",
        message: `Criterion ${criterion.index} has no assert step in scenario.ts.`,
        path: `scenario.criteria[${criterion.index}]`,
      });
    }

    if (scenarioEntry.sourceText.trim() !== criterion.sourceText.trim()) {
      issues.push({
        level: "warning",
        code: "scenario.source-text-mismatch",
        message: `Criterion ${criterion.index} sourceText in scenario.ts does not match acceptance.md.`,
        path: `scenario.criteria[${criterion.index}].sourceText`,
      });
    }
  }

  for (const entry of fixture.criteria) {
    if (!criteria.some((criterion) => criterion.index === entry.criterionIndex)) {
      issues.push({
        level: "warning",
        code: "scenario.orphan-criterion",
        message: `scenario.ts defines criterion ${entry.criterionIndex}, which is not in acceptance.md.`,
        path: `scenario.criteria[${entry.criterionIndex}]`,
      });
    }
  }

  for (const [actionId, locations] of collectActionIds(fixture)) {
    for (const location of locations) {
      if (location.count > 1) {
        issues.push({
          level: "error",
          code: "scenario.duplicate-action-id",
          message: `Duplicate actionId "${actionId}" appears ${location.count} times in criterion ${location.criterionIndex}.`,
          path: `scenario.criteria[${location.criterionIndex}].actionId.${actionId}`,
        });
      }
    }
  }
}

export async function validateProofProject(
  options: ValidateProjectOptions,
): Promise<ValidateProjectResult> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.configPath);
  const configDir = resolveConfigDir(configPath, cwd);
  const issues: ValidationIssue[] = [];

  let config: ProofConfig;
  try {
    config = await loadProofConfig(configPath);
  } catch (error) {
    issues.push({
      level: "error",
      code: "config.invalid",
      message: error instanceof Error ? error.message : String(error),
      path: "proof.config.ts",
    });
    return {
      ok: false,
      configPath,
      configDir,
      criteriaCount: 0,
      scenarioModule: "./scenario.ts",
      issues,
    };
  }

  const scenarioModule = config.scenario?.module ?? "./scenario.ts";

  let criteria;
  try {
    criteria = loadCriteriaFromFile(config.criteria, {
      baseDir: configDir,
    }).criteria;
  } catch (error) {
    issues.push({
      level: "error",
      code: "criteria.invalid",
      message: error instanceof Error ? error.message : String(error),
      path: config.criteria.file,
    });
    return {
      ok: false,
      configPath,
      configDir,
      criteriaCount: 0,
      scenarioModule,
      issues,
    };
  }

  withPrerequisites(criteria, resolvePrerequisiteMap(config));

  if (options.checkAuth !== false && config.auth) {
    try {
      resolveAuthSecrets(config.auth);
    } catch (error) {
      issues.push({
        level: "error",
        code: "auth.missing",
        message: error instanceof Error ? error.message : String(error),
        path: "auth",
      });
    }
  }

  if (options.checkApp) {
    const readyUrl = `${config.app.baseUrl}${config.app.readyPath}`;
    const ready = await checkReadiness(readyUrl);
    if (!ready) {
      issues.push({
        level: "warning",
        code: "app.not-ready",
        message: `App is not reachable at ${readyUrl}. Skeptic can start it with startCommand during verify.`,
        path: "app.readyPath",
      });
    }
  }

  let scenarioModulePath: string;
  try {
    scenarioModulePath = await resolveScenarioModulePath(
      configDir,
      scenarioModule,
    );
  } catch (error) {
    issues.push({
      level: "error",
      code: "scenario.module-missing",
      message: error instanceof Error ? error.message : String(error),
      path: scenarioModule,
    });
    return {
      ok: false,
      configPath,
      configDir,
      criteriaCount: criteria.length,
      scenarioModule,
      issues,
    };
  }

  let fixture: ReplayFixture;
  try {
    const scenario = await loadScenarioModule(scenarioModulePath);
    fixture = scenario.buildScenario({
      baseUrl: config.app.baseUrl,
      allowedOrigins: config.app.allowedOrigins,
      username: PLACEHOLDER_AUTH.username,
      password: PLACEHOLDER_AUTH.password,
      runId: "validate-dry-run",
      loginPath: config.auth?.loginPath ?? "/login",
      variables: {
        INVITE_EMAIL: "validate@example.com",
      },
    });
  } catch (error) {
    issues.push({
      level: "error",
      code: "scenario.invalid",
      message: error instanceof Error ? error.message : String(error),
      path: scenarioModule,
    });
    return {
      ok: false,
      configPath,
      configDir,
      criteriaCount: criteria.length,
      scenarioModule,
      issues,
    };
  }

  if (fixture.baseUrl !== config.app.baseUrl) {
    issues.push({
      level: "warning",
      code: "scenario.base-url-mismatch",
      message: `scenario.ts baseUrl (${fixture.baseUrl}) differs from proof.config.ts (${config.app.baseUrl}).`,
      path: "scenario.baseUrl",
    });
  }

  validateScenarioAlignment(criteria, fixture, issues);

  const hasErrors = issues.some((issue) => issue.level === "error");
  return {
    ok: !hasErrors,
    configPath,
    configDir,
    criteriaCount: criteria.length,
    scenarioModule,
    issues,
  };
}

export async function discoverProofConfigPath(
  cwd = process.cwd(),
): Promise<string | null> {
  for (const candidate of ["proof.config.ts", "skeptic.config.ts"]) {
    try {
      await access(join(cwd, candidate));
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

import {
  discoverProofConfigPath,
  validateProofProject,
  type ValidationIssue,
} from "@skeptic/core";

export interface ValidateCommandOptions {
  configPath?: string;
  cwd?: string;
  checkApp?: boolean;
  checkAuth?: boolean;
}

export interface ValidateCommandResult {
  ok: boolean;
  configPath: string;
  configDir: string;
  criteriaCount: number;
  scenarioModule: string;
  issues: ValidationIssue[];
  exitCode: 0 | 2 | 3;
}

export class ValidateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidateError";
  }
}

export async function runValidateCommand(
  options: ValidateCommandOptions,
): Promise<ValidateCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? (await discoverProofConfigPath(cwd));

  if (!configPath) {
    throw new ValidateError(
      "No proof.config.ts or skeptic.config.ts found in the current directory. Pass --config <path>.",
    );
  }

  const result = await validateProofProject({
    configPath,
    cwd,
    checkApp: options.checkApp ?? false,
    checkAuth: options.checkAuth ?? true,
  });

  return {
    ...result,
    exitCode: result.ok ? 0 : 2,
  };
}

import { access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

export interface ScaffoldInitOptions {
  cwd?: string;
  force?: boolean;
}

export interface ScaffoldInitResult {
  cwd: string;
  created: string[];
  skipped: string[];
}

const SCAFFOLD_FILES: Record<string, string> = {
  "proof.config.ts": `import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3000",
    startCommand: "npm run dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3000"],
  },
  criteria: {
    file: "acceptance.md",
    maxCriteria: 5,
  },
  auth: {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  },
  scenario: {
    module: "./scenario.ts",
  },
  prerequisites: {},
  limits: {
    maxSteps: 25,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
});
`,
  "acceptance.md": `# Acceptance criteria

1. A signed-in user can reach the main dashboard after submitting valid credentials.
2. Invalid credentials show an error message and keep the user on the login page.
`,
  "scenario.ts": `import type { ScenarioBuildContext } from "@skeptic/core";
import type { ReplayFixture } from "@skeptic/playwright-harness";

export function buildScenario(ctx: ScenarioBuildContext): ReplayFixture {
  const { baseUrl, allowedOrigins, username, password, loginPath } = ctx;
  const loginUrl = \`\${baseUrl}\${loginPath}\`;

  const loginSteps = [
    { actionId: "goto-login", type: "goto" as const, url: loginUrl },
    {
      actionId: "fill-username",
      type: "fill" as const,
      target: { testId: "username" },
      value: username,
    },
    {
      actionId: "fill-password",
      type: "fill" as const,
      target: { testId: "password" },
      value: password,
    },
    {
      actionId: "submit-login",
      type: "click" as const,
      target: { testId: "login-submit" },
    },
  ];

  return {
    version: 1,
    baseUrl,
    allowedOrigins: [...allowedOrigins],
    generatedAt: Date.now(),
    criteria: [
      {
        criterionIndex: 1,
        sourceText:
          "A signed-in user can reach the main dashboard after submitting valid credentials.",
        steps: [
          ...loginSteps,
          {
            actionId: "assert-dashboard",
            type: "assert" as const,
            assertion: {
              type: "visible",
              target: { testId: "dashboard" },
            },
          },
        ],
      },
      {
        criterionIndex: 2,
        sourceText:
          "Invalid credentials show an error message and keep the user on the login page.",
        steps: [
          { actionId: "goto-login", type: "goto" as const, url: loginUrl },
          {
            actionId: "fill-username",
            type: "fill" as const,
            target: { testId: "username" },
            value: username,
          },
          {
            actionId: "fill-password",
            type: "fill" as const,
            target: { testId: "password" },
            value: "wrong-password",
          },
          {
            actionId: "submit-login",
            type: "click" as const,
            target: { testId: "login-submit" },
          },
          {
            actionId: "assert-login-error",
            type: "assert" as const,
            assertion: {
              type: "visible",
              target: { testId: "login-error" },
            },
          },
        ],
      },
    ],
  };
}
`,
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function scaffoldProject(
  options: ScaffoldInitOptions = {},
): Promise<ScaffoldInitResult> {
  const cwd = options.cwd ?? process.cwd();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const [filename, content] of Object.entries(SCAFFOLD_FILES)) {
    const filePath = join(cwd, filename);
    const exists = await fileExists(filePath);

    if (exists && !options.force) {
      skipped.push(filename);
      continue;
    }

    await writeFile(filePath, content, "utf8");
    created.push(filename);
  }

  return { cwd, created, skipped };
}

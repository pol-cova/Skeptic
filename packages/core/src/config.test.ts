import { describe, expect, it } from "vitest";

import {
  defineProofConfig,
  parseProofConfig,
  ProofConfigError,
} from "./config.ts";
import {
  loadCriteriaFromFile,
  parseCriteriaMarkdown,
  withPrerequisites,
} from "./criteria.ts";
import { resolve } from "node:path";

const validConfig = {
  app: {
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3100"],
  },
  criteria: {
    file: "examples/demo-app/acceptance.md",
    maxCriteria: 3,
  },
  auth: {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  },
} as const;

describe("proof config", () => {
  it("accepts the demo proof config shape", () => {
    expect(defineProofConfig(validConfig)).toEqual(validConfig);
  });

  it("rejects invalid config before startup with useful errors", () => {
    expect(() =>
      parseProofConfig({
        ...validConfig,
        app: {
          ...validConfig.app,
          baseUrl: "not-a-url",
        },
      }),
    ).toThrow(ProofConfigError);

    expect(() =>
      parseProofConfig({
        ...validConfig,
        app: {
          ...validConfig.app,
          allowedOrigins: [
            "http://127.0.0.1:3100",
            "http://127.0.0.1:3101",
            "http://127.0.0.1:3102",
            "http://127.0.0.1:3103",
            "http://127.0.0.1:3104",
            "http://127.0.0.1:3105",
          ],
        },
      }),
    ).toThrow(/cannot exceed 5 entries/u);

    expect(() =>
      parseProofConfig({
        ...validConfig,
        criteria: {
          ...validConfig.criteria,
          maxCriteria: 11,
        },
      }),
    ).toThrow(/cannot exceed 10/u);

    expect(() =>
      parseProofConfig({
        ...validConfig,
        auth: {
          ...validConfig.auth,
          passwordEnv: "proof_test_password",
        },
      }),
    ).toThrow(/uppercase/u);
  });
});

const demoAcceptance = `# Invite teammate

1. An invalid email address shows a validation message and does not create an invitation.
2. A valid email address creates an invitation and displays it in the Pending invitations list.
3. Inviting the same email twice shows a duplicate-invitation error and does not create a second row.
`;

describe("criteria parsing", () => {
  it("parses the demo markdown into three ordered criteria with unchanged source text", () => {
    const { criteria } = parseCriteriaMarkdown(demoAcceptance, {
      maxCriteria: 3,
    });

    expect(criteria).toHaveLength(3);
    expect(criteria.map((criterion) => criterion.sourceText)).toEqual([
      "An invalid email address shows a validation message and does not create an invitation.",
      "A valid email address creates an invitation and displays it in the Pending invitations list.",
      "Inviting the same email twice shows a duplicate-invitation error and does not create a second row.",
    ]);
  });

  it("loads criteria from the demo acceptance file", () => {
    const repoRoot = resolve(import.meta.dirname, "../../..");
    const { criteria } = loadCriteriaFromFile(
      {
        file: "examples/demo-app/acceptance.md",
        maxCriteria: 3,
      },
      { baseDir: repoRoot },
    );

    expect(criteria).toHaveLength(3);
  });

  it("fails explicitly when too many criteria are present", () => {
    const tooMany = `${demoAcceptance}\n4. A fourth criterion should not be accepted.\n`;

    expect(() => parseCriteriaMarkdown(tooMany, { maxCriteria: 3 })).toThrow(
      /defines 4 criteria/u,
    );
  });

  it("represents explicit prerequisites without changing source text", () => {
    const { criteria } = parseCriteriaMarkdown(demoAcceptance, {
      maxCriteria: 3,
    });
    const withDeps = withPrerequisites(criteria, { 3: [2] });

    expect(withDeps[2]?.prerequisites).toEqual([2]);
    expect(withDeps[2]?.sourceText).toBe(
      "Inviting the same email twice shows a duplicate-invitation error and does not create a second row.",
    );
  });
});

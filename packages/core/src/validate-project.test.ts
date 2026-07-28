import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseCriteriaMarkdown, withPrerequisites } from "./criteria.ts";
import { resolvePrerequisiteMap } from "./scenario-loader.ts";
import { validateProofProject } from "./validate-project.ts";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const demoConfigPath = join(
  repoRoot,
  "examples",
  "demo-app",
  "proof.config.ts",
);

describe("validateProofProject", () => {
  it("accepts the demo app configuration and scenario alignment", async () => {
    const result = await validateProofProject({
      configPath: demoConfigPath,
      cwd: repoRoot,
      checkAuth: false,
      checkApp: false,
    });

    expect(result.ok).toBe(true);
    expect(result.criteriaCount).toBe(3);
    expect(result.issues.filter((issue) => issue.level === "error")).toEqual(
      [],
    );
  });

  it("uses config prerequisites instead of demo defaults", () => {
    const { criteria } = parseCriteriaMarkdown(
      "1. First.\n2. Second.\n3. Third depends on second.\n",
      { maxCriteria: 3 },
    );

    const withoutConfig = withPrerequisites(
      criteria,
      resolvePrerequisiteMap({}),
    );
    expect(
      withoutConfig.every((entry) => entry.prerequisites.length === 0),
    ).toBe(true);

    const withConfig = withPrerequisites(
      criteria,
      resolvePrerequisiteMap({ prerequisites: { "3": [2] } }),
    );
    expect(withConfig[2]?.prerequisites).toEqual([2]);
  });
});

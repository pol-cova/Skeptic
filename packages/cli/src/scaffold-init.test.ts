import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scaffoldProject } from "./scaffold-init.ts";

const SCAFFOLD_FILES = [
  ".gitignore",
  "tsconfig.json",
  "skeptic-config.d.ts",
  "proof.config.ts",
  "acceptance.md",
  "scenario.ts",
];

describe("scaffold init", () => {
  it("creates verification project files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "skeptic-init-"));

    try {
      const result = await scaffoldProject({ cwd });

      expect(result.created).toEqual(SCAFFOLD_FILES);
      expect(result.skipped).toEqual([]);

      const config = await readFile(join(cwd, "proof.config.ts"), "utf8");
      expect(config).toContain("satisfies ProofConfig");
      expect(config).not.toContain("@skeptic/core");
      expect(config).toContain("./scenario.ts");

      const scenario = await readFile(join(cwd, "scenario.ts"), "utf8");
      expect(scenario).toContain("buildScenario");
      expect(scenario).toContain("./skeptic-config.d.ts");

      const acceptance = await readFile(join(cwd, "acceptance.md"), "utf8");
      expect(acceptance).toMatch(/^1\./m);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("skips existing files unless force is set", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "skeptic-init-force-"));

    try {
      await scaffoldProject({ cwd });
      const again = await scaffoldProject({ cwd });

      expect(again.created).toEqual([]);
      expect(again.skipped).toHaveLength(SCAFFOLD_FILES.length);

      const forced = await scaffoldProject({ cwd, force: true });
      expect(forced.created).toHaveLength(SCAFFOLD_FILES.length);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

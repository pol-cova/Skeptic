import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runValidateCommand } from "./validate-command.ts";
import { scaffoldProject } from "./scaffold-init.ts";

describe("validate command", () => {
  it("validates a freshly scaffolded project", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "skeptic-validate-"));

    try {
      await scaffoldProject({ cwd, force: true });
      const result = await runValidateCommand({
        configPath: "proof.config.ts",
        cwd,
        checkAuth: false,
      });

      expect(result.ok).toBe(true);
      expect(result.criteriaCount).toBe(2);
      expect(result.issues.filter((issue) => issue.level === "error")).toEqual(
        [],
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

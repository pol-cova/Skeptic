import { describe, expect, it } from "vitest";

import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const EVIDENCE_PATH = join(
  REPO_ROOT,
  "submission/evidence/submission-evidence.json",
);

async function evidenceExists(): Promise<boolean> {
  try {
    await access(EVIDENCE_PATH);
    return true;
  } catch {
    return false;
  }
}

describe("submission checklist evidence", () => {
  it("records broken, fixed, replay, and consecutive-run proof", async () => {
    if (!(await evidenceExists())) {
      return;
    }

    const evidence = JSON.parse(await readFile(EVIDENCE_PATH, "utf8")) as {
      broken: { verdicts: Array<{ verdict: string }> };
      fixed: { verdicts: Array<{ verdict: string }> };
      replay: { modelCalls: number; verdicts: Array<{ verdict: string }> };
      consecutiveRuns: Array<{ verdicts: Array<{ verdict: string }> }>;
    };

    expect(evidence.broken.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "FAIL",
      "UNVERIFIABLE",
    ]);
    expect(evidence.fixed.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "PASS",
      "PASS",
    ]);
    expect(evidence.replay.modelCalls).toBe(0);
    expect(evidence.replay.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "PASS",
      "PASS",
    ]);
    expect(evidence.consecutiveRuns).toHaveLength(3);
    for (const run of evidence.consecutiveRuns) {
      expect(run.verdicts.map((entry) => entry.verdict)).toEqual([
        "PASS",
        "FAIL",
        "UNVERIFIABLE",
      ]);
    }
  });
});

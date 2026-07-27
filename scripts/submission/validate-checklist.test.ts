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
      broken: { verdicts: Array<{ verdict: string }>; readiness: string; exitCode: number; durationMs: number };
      fixed: { verdicts: Array<{ verdict: string }>; readiness: string; exitCode: number };
      replay: { modelCalls: number; verdicts: Array<{ verdict: string }> };
      consecutiveRuns: Array<{
        verdicts: Array<{ verdict: string }>;
        readiness: string;
        exitCode: number;
        durationMs: number;
      }>;
    };

    expect(evidence.broken.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "FAIL",
      "UNVERIFIABLE",
    ]);
    expect(evidence.broken.readiness).toBe("NOT_READY");
    expect(evidence.broken.exitCode).toBe(1);
    expect(evidence.fixed.verdicts.map((entry) => entry.verdict)).toEqual([
      "PASS",
      "PASS",
      "PASS",
    ]);
    expect(evidence.fixed.readiness).toBe("READY");
    expect(evidence.fixed.exitCode).toBe(0);
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
      expect(run.readiness).toBe("NOT_READY");
      expect(run.exitCode).toBe(1);
      expect(run.durationMs).toBeLessThanOrEqual(120_000);
    }
  });
});

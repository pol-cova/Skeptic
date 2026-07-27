/**
 * Optional P1 helper: record silent B-roll of prerecorded evidence reports.
 * Narration and terminal segments still require manual capture per demo-script.md.
 */
import { access, mkdir, rename } from "node:fs/promises";
import { join, resolve } from "node:path";

import { chromium } from "@playwright/test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const SUBMISSION_ROOT = join(REPO_ROOT, "submission");
const OUTPUT_PATH = join(SUBMISSION_ROOT, "assets", "demo-broll.webm");

const REPORTS = [
  {
    label: "broken",
    htmlPath: join(SUBMISSION_ROOT, "fallback/broken/report.html"),
  },
  {
    label: "fixed",
    htmlPath: join(SUBMISSION_ROOT, "fallback/fixed/report.html"),
  },
] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function scrollReport(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(async () => {
    const delay = (ms: number) =>
      new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
    const step = Math.max(window.innerHeight * 0.75, 240);
    let position = 0;
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    while (position < maxScroll) {
      position = Math.min(position + step, maxScroll);
      window.scrollTo({ top: position, behavior: "smooth" });
      await delay(650);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    await delay(500);
  });
}

async function main(): Promise<void> {
  for (const report of REPORTS) {
    if (!(await pathExists(report.htmlPath))) {
      console.error(
        `Missing ${report.label} report at ${report.htmlPath}. Run pnpm submission:generate first.`,
      );
      process.exitCode = 1;
      return;
    }
  }

  await mkdir(join(SUBMISSION_ROOT, "assets"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: join(SUBMISSION_ROOT, "assets"),
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  for (const report of REPORTS) {
    await page.goto(`file://${report.htmlPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await scrollReport(page);
    await page.waitForTimeout(600);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    console.error("Playwright did not produce a video artifact.");
    process.exitCode = 1;
    return;
  }

  const recordedPath = await video.path();
  await rename(recordedPath, OUTPUT_PATH);

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: OUTPUT_PATH,
        note: "Silent B-roll only. Record narration and terminal beats separately per submission/demo-script.md.",
      },
      null,
      2,
    ),
  );
}

await main();

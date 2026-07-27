import type {
  ScreenshotProvider,
  ScreenshotCaptureContext,
} from "@skeptic/evidence";
import type { Page } from "playwright";

/**
 * PlaywrightScreenshotProvider captures PNG screenshots from a Playwright page.
 *
 * Uses a getter function pattern to avoid stale page references after harness restarts.
 * Captures full-page screenshots including off-screen content.
 *
 * @example
 * ```typescript
 * const provider = new PlaywrightScreenshotProvider(() => harness.page);
 * const pngData = await provider.capture({ runId, criterionIndex, sequence });
 * ```
 */
export class PlaywrightScreenshotProvider implements ScreenshotProvider {
  /**
   * Creates a new screenshot provider.
   *
   * @param getPage - Function that returns the current Playwright page.
   *                  Using a getter avoids stale references when the harness
   *                  launches/closes the browser between captures.
   */
  constructor(private readonly getPage: () => Page | null) {}

  /**
   * Captures a PNG screenshot from the current page.
   *
   * @param context - Screenshot capture context (runId, criterionIndex, sequence)
   * @returns PNG image data as Uint8Array
   * @throws Error if the page is null (harness not launched)
   * @throws Error if screenshot capture fails (propagated from Playwright)
   */
  async capture(context: ScreenshotCaptureContext): Promise<Uint8Array> {
    const page = this.getPage();
    
    if (!page) {
      throw new Error(
        "Cannot capture screenshot: harness not launched. Call harness.launch() first."
      );
    }

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    return new Uint8Array(buffer);
  }
}

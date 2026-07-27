import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  browserActionSchema,
  type AssertionResult,
  type PageObservation,
} from "@skeptic/core";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

import { executeBrowserAction } from "./actions.ts";
import { harnessError, type HarnessError } from "./errors.ts";
import { NetworkLog } from "./network-log.ts";
import { captureObservation } from "./observe.ts";
import { assertAllowedUrl, isAllowedUrl } from "./origin.ts";

export interface HarnessOptions {
  allowedOrigins: string[];
  headless?: boolean;
  defaultTimeoutMs?: number;
}

export interface ActionResult {
  ok: boolean;
  error?: HarnessError;
  observation: PageObservation;
  assertionResult?: AssertionResult;
}

export class PlaywrightHarness {
  readonly #options: HarnessOptions;
  #browser: Browser | null = null;
  #context: BrowserContext | null = null;
  #page: Page | null = null;
  readonly #networkLog = new NetworkLog();
  readonly #consoleErrors: string[] = [];
  #tracingStarted = false;
  #traceExported = false;

  constructor(options: HarnessOptions) {
    if (options.allowedOrigins.length === 0) {
      throw new Error(
        "PlaywrightHarness requires at least one allowed origin.",
      );
    }

    this.#options = options;
  }

  get page(): Page {
    if (!this.#page) {
      throw new Error("Harness is not launched. Call launch() first.");
    }

    return this.#page;
  }

  get networkLog(): NetworkLog {
    return this.#networkLog;
  }

  async launch(): Promise<void> {
    if (this.#browser) {
      throw new Error("Harness is already launched.");
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.#launchBrowser();
        return;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        await this.#resetLaunchState();
      }
    }

    throw lastError ?? new Error("Browser launch failed after retry.");
  }

  async #launchBrowser(): Promise<void> {
    this.#browser = await chromium.launch({
      headless: this.#options.headless ?? true,
    });
    this.#context = await this.#browser.newContext();
    await this.#context.tracing.start({ screenshots: true, snapshots: true });
    this.#tracingStarted = true;
    await this.#installRouteGuard(this.#context);
    this.#page = await this.#context.newPage();
    this.#attachListeners(this.#page);
  }

  async #resetLaunchState(): Promise<void> {
    if (this.#context && this.#tracingStarted && !this.#traceExported) {
      await this.#context.tracing.stop().catch(() => undefined);
    }

    await this.#context?.close().catch(() => undefined);
    await this.#browser?.close().catch(() => undefined);
    this.#page = null;
    this.#context = null;
    this.#browser = null;
    this.#tracingStarted = false;
    this.#traceExported = false;
    this.#consoleErrors.length = 0;
    this.#networkLog.clear();
  }

  async captureScreenshot(): Promise<Uint8Array> {
    const buffer = await this.page.screenshot({ fullPage: true });
    return new Uint8Array(buffer);
  }

  async exportTrace(): Promise<Uint8Array> {
    if (!this.#context || !this.#tracingStarted || this.#traceExported) {
      return new Uint8Array();
    }

    const traceDir = await mkdtemp(join(tmpdir(), "skeptic-trace-"));
    const tracePath = join(traceDir, "trace.zip");

    try {
      await this.#context.tracing.stop({ path: tracePath });
      this.#traceExported = true;
      const data = await readFile(tracePath);
      return new Uint8Array(data);
    } finally {
      await rm(traceDir, { recursive: true, force: true });
    }
  }

  async close(): Promise<void> {
    if (this.#context && this.#tracingStarted && !this.#traceExported) {
      await this.#context.tracing.stop().catch(() => undefined);
      this.#traceExported = true;
    }

    await this.#context?.close();
    await this.#browser?.close();
    this.#page = null;
    this.#context = null;
    this.#browser = null;
    this.#consoleErrors.length = 0;
    this.#networkLog.clear();
  }

  async observe(): Promise<PageObservation> {
    return captureObservation(
      this.page,
      this.#consoleErrors,
      this.#networkLog.snapshot(),
    );
  }

  async execute(rawAction: unknown): Promise<ActionResult> {
    const parsed = browserActionSchema.safeParse(rawAction);

    if (!parsed.success) {
      return {
        ok: false,
        error: harnessError(
          "INVALID_ACTION",
          parsed.error.issues.map((issue) => issue.message).join("; "),
        ),
        observation: await this.observe(),
      };
    }

    const action = parsed.data;

    try {
      const execution = await executeBrowserAction(
        {
          page: this.page,
          allowedOrigins: this.#options.allowedOrigins,
          networkLog: this.#networkLog,
          defaultTimeoutMs: this.#options.defaultTimeoutMs ?? 10_000,
        },
        action,
      );

      if (execution.error) {
        return {
          ok: false,
          error: execution.error,
          observation: await this.observe(),
          ...(execution.assertionResult
            ? { assertionResult: execution.assertionResult }
            : {}),
        };
      }

      return {
        ok: true,
        observation: await this.observe(),
        ...(execution.assertionResult
          ? { assertionResult: execution.assertionResult }
          : {}),
      };
    } catch (error) {
      return {
        ok: false,
        error: harnessError(
          "ACTION_FAILED",
          error instanceof Error ? error.message : String(error),
        ),
        observation: await this.observe(),
      };
    }
  }

  async #installRouteGuard(context: BrowserContext): Promise<void> {
    await context.route("**/*", (route) => {
      const requestUrl = route.request().url();
      if (isAllowedUrl(requestUrl, this.#options.allowedOrigins)) {
        void route.continue();
        return;
      }

      void route.abort("blockedbyclient");
    });
  }

  #attachListeners(page: Page): void {
    this.#networkLog.attach(page);

    page.on("console", (message) => {
      if (message.type() === "error") {
        this.#consoleErrors.push(message.text());
      }
    });

    page.on("pageerror", (error) => {
      this.#consoleErrors.push(error.message);
    });
  }
}

export { assertAllowedUrl, isAllowedUrl } from "./origin.ts";
export { resolveLocator } from "./locator.ts";
export {
  harnessError,
  type HarnessError,
  type HarnessErrorCode,
} from "./errors.ts";

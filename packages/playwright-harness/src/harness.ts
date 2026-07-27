import {
  browserActionSchema,
  type AssertionResult,
  type PageObservation,
  type RunEvent,
} from "@skeptic/core";
import type { EvidenceStore } from "@skeptic/evidence";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { executeBrowserAction } from "./actions.ts";
import { harnessError, type HarnessError } from "./errors.ts";
import { NetworkLog } from "./network-log.ts";
import { captureObservation } from "./observe.ts";
import { assertAllowedUrl, isAllowedUrl } from "./origin.ts";
import { PlaywrightScreenshotProvider } from "./screenshot-provider.ts";
import { PlaywrightTraceProvider } from "./trace-provider.ts";

/**
 * Configuration options for PlaywrightHarness.
 */
export interface HarnessOptions {
  allowedOrigins: string[];
  headless?: boolean;
  defaultTimeoutMs?: number;
  
  /**
   * Optional EvidenceStore instance for automatic evidence persistence.
   * 
   * When provided, the harness will automatically:
   * - Stream all browser actions, assertions, and observations as events
   * - Capture screenshots on assertions and action failures
   * - Record Playwright traces for the entire verification run
   * - Persist network observations to the evidence bundle
   * 
   * **IMPORTANT:** The EvidenceStore MUST be initialized (via `store.initialize()`)
   * before being passed to the harness constructor. Uninitialized stores will
   * throw an error on the first event append operation.
   * 
   * When undefined, the harness operates without evidence persistence,
   * maintaining backward compatibility with existing tests.
   * 
   * @see EvidenceStore.initialize()
   */
  evidenceStore?: EvidenceStore;
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
  
  // Evidence integration fields
  readonly #evidenceStore: EvidenceStore | undefined;
  readonly #screenshotProvider: PlaywrightScreenshotProvider | undefined;
  readonly #traceProvider: PlaywrightTraceProvider | undefined;
  #runId: string | undefined;

  constructor(options: HarnessOptions) {
    if (options.allowedOrigins.length === 0) {
      throw new Error(
        "PlaywrightHarness requires at least one allowed origin.",
      );
    }

    this.#options = options;
    this.#evidenceStore = options.evidenceStore;
    
    // Register providers if evidence store is present
    if (this.#evidenceStore) {
      // Screenshot provider captures from this.page using a getter to avoid stale references
      this.#screenshotProvider = new PlaywrightScreenshotProvider(() => this.#page);
      
      // Trace provider will be populated with the trace path during close()
      this.#traceProvider = new PlaywrightTraceProvider();
      
      // Note: The providers are already registered in EvidenceStore during initialize().
      // The harness stores references to them for capture operations.
    }
  }

  /**
   * Sets the run ID for evidence streaming.
   * 
   * This method must be called after EvidenceStore.initialize() and before
   * executing any actions that stream events. The runId is included in all
   * events appended to the evidence store.
   * 
   * @param runId - The unique identifier for this verification run
   */
  setRunId(runId: string): void {
    this.#runId = runId;
  }

  get page(): Page {
    if (!this.#page) {
      throw new Error("Harness is not launched. Call launch() first.");
    }

    return this.#page;
  }

  async launch(): Promise<void> {
    if (this.#browser) {
      throw new Error("Harness is already launched.");
    }

    this.#browser = await chromium.launch({
      headless: this.#options.headless ?? true,
    });
    this.#context = await this.#browser.newContext();
    
    // Start tracing if evidence store and trace provider are present
    if (this.#evidenceStore && this.#traceProvider && this.#context) {
      try {
        await this.#context.tracing.start({
          screenshots: true,
          snapshots: true,
        });
      } catch (err: unknown) {
        // Log warning but continue without tracing
        console.warn(
          `Failed to start tracing: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    
    await this.#installRouteGuard(this.#context);
    this.#page = await this.#context.newPage();
    this.#attachListeners(this.#page);
  }

  async close(): Promise<void> {
    // Stop tracing and capture trace file before closing context
    if (this.#context && this.#evidenceStore && this.#traceProvider) {
      try {
        const tempTracePath = join(tmpdir(), `trace-${Date.now()}.zip`);
        await this.#context.tracing.stop({ path: tempTracePath });
        this.#traceProvider.setTracePath(tempTracePath);
      } catch (err: unknown) {
        console.warn(
          `Failed to stop tracing: ${err instanceof Error ? err.message : String(err)}`
        );
        // Do not set trace path—getTrace() will throw during finalization
      }
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
    const observation = await captureObservation(
      this.page,
      this.#consoleErrors,
      this.#networkLog.snapshot(),
    );

    // Stream page.observed event to EvidenceStore
    // Requirements: 9.1, 9.2, 9.3
    await this.#appendEventIfStore({
      type: "page.observed",
      payload: observation,
    });

    return observation;
  }

  async execute(rawAction: unknown, criterionIndex?: number): Promise<ActionResult> {
    const parsed = browserActionSchema.safeParse(rawAction);

    if (!parsed.success) {
      const error = harnessError(
        "INVALID_ACTION",
        parsed.error.issues.map((issue) => issue.message).join("; "),
      );
      
      // Stream action.failed event for invalid actions (Subtask 7.2)
      await this.#appendEventIfStore({
        type: "action.failed",
        payload: { error: error.code, message: error.message },
        criterionIndex,
      });
      
      return {
        ok: false,
        error,
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

      // Stream action events after successful execution (Subtask 7.3)
      await this.#streamActionEvent(action, criterionIndex);

      if (execution.error) {
        // Capture failure screenshot before returning error (Subtask 7.6)
        await this.#captureFailureScreenshot(criterionIndex);
        
        return {
          ok: false,
          error: execution.error,
          observation: await this.observe(),
          ...(execution.assertionResult
            ? { assertionResult: execution.assertionResult }
            : {}),
        };
      }

      // Stream assertion.checked events if assertion result exists (Subtask 7.4)
      if (execution.assertionResult) {
        await this.#appendEventIfStore({
          type: "assertion.checked",
          payload: execution.assertionResult,
          criterionIndex,
        });
      }

      return {
        ok: true,
        observation: await this.observe(),
        ...(execution.assertionResult
          ? { assertionResult: execution.assertionResult }
          : {}),
      };
    } catch (error) {
      // Capture failure screenshot on unexpected exceptions (Subtask 7.6)
      await this.#captureFailureScreenshot(criterionIndex);
      
      // Stream action.failed event for unexpected exceptions (Subtask 7.7)
      await this.#appendEventIfStore({
        type: "action.failed",
        payload: {
          action: action.type,
          message: error instanceof Error ? error.message : String(error),
        },
        criterionIndex,
      });
      
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

    // NEW: Stream network observations to evidence store
    // Requirements: 3.1, 3.2, 3.4
    if (this.#evidenceStore) {
      page.on("response", async (response) => {
        let parsed: URL;
        try {
          parsed = new URL(response.url());
        } catch {
          return;
        }

        await this.#appendEventIfStore({
          type: "network.observed",
          payload: {
            method: response.request().method(),
            path: `${parsed.pathname}${parsed.search}`,
            status: response.status(),
          },
        });
      });
    }
  }

  /**
   * Appends an event to the evidence store if present.
   * 
   * Returns early if evidenceStore or runId is undefined.
   * Adds runId, timestamp (Date.now()), and actor ("harness") to the event.
   * Throws an Error with the failure message if append returns an error result.
   * 
   * This helper method is used throughout the harness to stream events to
   * the evidence bundle during verification runs.
   * 
   * @param event - Event object without runId, timestamp, actor, or sequence fields
   * @throws Error if evidence write fails (escalates to HARNESS_ERROR)
   */
  async #appendEventIfStore(
    event: Omit<RunEvent, "runId" | "timestamp" | "actor" | "sequence">
  ): Promise<void> {
    // Return early if evidenceStore or runId is undefined
    if (!this.#evidenceStore || !this.#runId) {
      return;
    }

    // Add runId, timestamp, and actor to the event
    const result = await this.#evidenceStore.appendEvent({
      runId: this.#runId,
      timestamp: Date.now(),
      actor: "harness",
      ...event,
    });

    // Throw Error with message if append returns error result
    if (!result.ok) {
      throw new Error(`Evidence write failed: ${result.message}`);
    }
  }

  /**
   * Streams the appropriate browser action event based on action type.
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.2
   * 
   * This helper method accepts a BrowserAction and optional criterionIndex,
   * switches on action.type to create the appropriate event payload, and
   * streams it to the evidence store via #appendEventIfStore().
   * 
   * Event types:
   * - goto → browser.navigated (url in payload)
   * - click → browser.clicked (locator in payload)
   * - fill → browser.filled (locator and "[REDACTED]" value - Requirement 13.2)
   * - select → browser.selected (locator and value)
   * - press → browser.pressed (key and optional locator)
   * - waitFor → browser.waited (condition and timeoutMs)
   * - assert → skipped (handled separately in execute())
   * 
   * @param action - The browser action to stream
   * @param criterionIndex - Optional criterion index to associate with the event
   */
  async #streamActionEvent(
    action: {
      type: string;
      url?: string;
      target?: unknown;
      value?: string;
      key?: string;
      timeoutMs?: number;
    },
    criterionIndex?: number
  ): Promise<void> {
    switch (action.type) {
      case "goto":
        await this.#appendEventIfStore({
          type: "browser.navigated",
          payload: { url: action.url! },
          criterionIndex,
        });
        break;

      case "click":
        await this.#appendEventIfStore({
          type: "browser.clicked",
          payload: { locator: JSON.stringify(action.target) },
          criterionIndex,
        });
        break;

      case "fill":
        // Requirement 13.2: Always redact fill values
        await this.#appendEventIfStore({
          type: "browser.filled",
          payload: {
            locator: JSON.stringify(action.target),
            value: "[REDACTED]",
          },
          criterionIndex,
        });
        break;

      case "select":
        await this.#appendEventIfStore({
          type: "browser.selected",
          payload: {
            locator: JSON.stringify(action.target),
            value: action.value!,
          },
          criterionIndex,
        });
        break;

      case "press":
        await this.#appendEventIfStore({
          type: "browser.pressed",
          payload: {
            key: action.key!,
            ...(action.target ? { locator: JSON.stringify(action.target) } : {}),
          },
          criterionIndex,
        });
        break;

      case "waitFor":
        await this.#appendEventIfStore({
          type: "browser.waited",
          payload: {
            condition: action.target ? JSON.stringify(action.target) : "timeout",
            ...(action.timeoutMs !== undefined ? { timeoutMs: action.timeoutMs } : {}),
          },
          criterionIndex,
        });
        break;

      case "assert":
        // Skip assert actions - handled separately in execute()
        break;
    }
  }

  /**
   * Captures and stores a screenshot on action failure.
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4
   * 
   * This helper method triggers screenshot capture when an action fails by
   * streaming a synthetic assertion.checked event with passed=false to trigger
   * EvidenceStore's automatic screenshot handling.
   * 
   * The method:
   * - Returns early if evidenceStore or page is undefined
   * - Creates synthetic assertion.checked event with passed=false
   * - Includes criterionIndex in the event if provided
   * - Wraps in try-catch to log warning on failure without aborting
   * 
   * The EvidenceStore will automatically call the ScreenshotProvider to capture
   * the screenshot when it receives the assertion.checked event with passed=false.
   * 
   * Errors during the event streaming are logged but do not throw additional
   * exceptions, ensuring that action failure error handling can proceed.
   * 
   * @param criterionIndex - Optional criterion index to associate with the screenshot
   */
  async #captureFailureScreenshot(criterionIndex?: number): Promise<void> {
    // Return early if evidenceStore or page is undefined
    if (!this.#evidenceStore || !this.#page) {
      return;
    }

    try {
      // Create synthetic assertion.checked event with passed=false to trigger
      // EvidenceStore's automatic screenshot handling via ScreenshotProvider
      await this.#appendEventIfStore({
        type: "assertion.checked",
        payload: {
          type: "action_failure",
          passed: false,
          actual: "action failed",
          expected: "action success",
        },
        criterionIndex,
      });
    } catch (err: unknown) {
      // Log warning on failure without aborting
      console.warn(
        `Failed to capture failure screenshot: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export { assertAllowedUrl, isAllowedUrl } from "./origin.ts";
export { resolveLocator } from "./locator.ts";
export {
  harnessError,
  type HarnessError,
  type HarnessErrorCode,
} from "./errors.ts";

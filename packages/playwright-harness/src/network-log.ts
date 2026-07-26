import type { NetworkObservation } from "@skeptic/core";
import type { Page } from "playwright";

const MAX_NETWORK_EVENTS = 25;

export class NetworkLog {
  readonly #entries: NetworkObservation[] = [];

  attach(page: Page): void {
    page.on("response", (response) => {
      let parsed: URL;

      try {
        parsed = new URL(response.url());
      } catch {
        return;
      }

      this.#entries.push({
        method: response.request().method(),
        path: `${parsed.pathname}${parsed.search}`,
        status: response.status(),
      });

      if (this.#entries.length > MAX_NETWORK_EVENTS) {
        this.#entries.shift();
      }
    });
  }

  snapshot(): NetworkObservation[] {
    return [...this.#entries];
  }

  clear(): void {
    this.#entries.length = 0;
  }
}

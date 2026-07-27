import type { NetworkObservation } from "@skeptic/core";
import type { Page } from "playwright";

const MAX_NETWORK_EVENTS = 25;

export type NetworkObservationHandler = (
  observation: NetworkObservation,
) => void;

export class NetworkLog {
  readonly #entries: NetworkObservation[] = [];
  readonly #handlers = new Set<NetworkObservationHandler>();

  attach(page: Page): void {
    page.on("response", (response) => {
      let parsed: URL;

      try {
        parsed = new URL(response.url());
      } catch {
        return;
      }

      const observation: NetworkObservation = {
        method: response.request().method(),
        path: `${parsed.pathname}${parsed.search}`,
        status: response.status(),
      };

      this.#entries.push(observation);

      if (this.#entries.length > MAX_NETWORK_EVENTS) {
        this.#entries.shift();
      }

      for (const handler of this.#handlers) {
        handler(observation);
      }
    });
  }

  subscribe(handler: NetworkObservationHandler): void {
    this.#handlers.add(handler);
  }

  unsubscribe(handler: NetworkObservationHandler): void {
    this.#handlers.delete(handler);
  }

  unsubscribeAll(): void {
    this.#handlers.clear();
  }

  snapshot(): NetworkObservation[] {
    return [...this.#entries];
  }

  clear(): void {
    this.#entries.length = 0;
  }
}

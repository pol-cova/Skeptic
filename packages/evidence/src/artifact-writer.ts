import { mkdir, writeFile, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { redactForPersistence } from "@skeptic/core";
import type { RunMetadata } from "@skeptic/core";
import type { NetworkObservation } from "./interfaces.ts";

const MAX_NETWORK_OBSERVATIONS = 5000;

export class ArtifactWriter {
  private readonly artifactRoot: string;

  constructor(artifactRoot: string) {
    this.artifactRoot = artifactRoot;
  }

  async writeScreenshot(filename: string, data: Uint8Array): Promise<string> {
    const relativePath = `screenshots/${filename}`;
    const absolutePath = join(this.artifactRoot, "screenshots", filename);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);

    return relativePath;
  }

  async writeTrace(data: Uint8Array): Promise<string> {
    const relativePath = "traces/trace.zip";
    const absolutePath = join(this.artifactRoot, "traces", "trace.zip");

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);

    return relativePath;
  }

  async writeNetworkObservations(
    observations: NetworkObservation[],
  ): Promise<string> {
    const relativePath = "network/observations.json";
    const absolutePath = join(
      this.artifactRoot,
      "network",
      "observations.json",
    );
    const limited = observations.slice(0, MAX_NETWORK_OBSERVATIONS);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, JSON.stringify(limited, null, 2), "utf-8");

    return relativePath;
  }

  async writeMetadata(
    metadata: RunMetadata,
    secretSet: string[],
  ): Promise<void> {
    const redacted = redactForPersistence(metadata, secretSet);
    const finalPath = join(this.artifactRoot, "metadata.json");
    const tempPath = join(
      this.artifactRoot,
      `.metadata.${randomUUID()}.tmp`,
    );

    await writeFile(tempPath, JSON.stringify(redacted, null, 2), "utf-8");
    await rename(tempPath, finalPath);
  }
}

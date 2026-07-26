import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  persistedRunBundleSchema,
  type PersistedRunBundle,
} from "@skeptic/core";

import type { ValidationResult } from "./interfaces.ts";

export class BundleValidator {
  validate(bundle: PersistedRunBundle, artifactRoot: string): ValidationResult {
    const errors: string[] = [];
    const unresolvedRefs: string[] = [];

    // 1. Schema validation
    const parseResult = persistedRunBundleSchema.safeParse(bundle);
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push(
          `Schema error at ${issue.path.join(".")}: ${issue.message}`,
        );
      }
    }

    // 2. Uniqueness check: (runId, sequence) pairs
    const seen = new Set<string>();
    for (const event of bundle.events) {
      const key = `(${event.runId}, ${event.sequence})`;
      if (seen.has(key)) {
        errors.push(`Duplicate (runId, sequence): ${key}`);
      } else {
        seen.add(key);
      }
    }

    // 3. Artifact reference integrity
    for (const event of bundle.events) {
      if (event.artifactRefs && event.artifactRefs.length > 0) {
        for (const ref of event.artifactRefs) {
          const resolved = resolve(artifactRoot, ref);
          if (!existsSync(resolved)) {
            unresolvedRefs.push(ref);
          }
        }
      }
    }

    return {
      valid: errors.length === 0 && unresolvedRefs.length === 0,
      errors,
      unresolvedRefs,
    };
  }
}

import {
  formatProofConfigError,
  proofConfigSchema,
  type ProofConfig,
} from "./config.schema.ts";

export class ProofConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofConfigError";
  }
}

export function parseProofConfig(input: unknown): ProofConfig {
  const result = proofConfigSchema.safeParse(input);
  if (!result.success) {
    throw new ProofConfigError(formatProofConfigError(result.error));
  }
  return result.data;
}

export function defineProofConfig(input: unknown): ProofConfig {
  return parseProofConfig(input);
}

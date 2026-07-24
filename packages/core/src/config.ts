export function defineProofConfig<const T extends Record<string, unknown>>(
  config: T,
): T {
  return config;
}

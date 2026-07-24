import type { ProofAuthConfig } from "./config.schema.ts";

export const REDACTED_SECRET = "[REDACTED]";

export interface ResolvedAuthSecrets {
  username: string;
  password: string;
  usernameSource: string;
  passwordSource: string;
}

export function resolveAuthSecrets(
  auth: ProofAuthConfig,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedAuthSecrets {
  const username = env[auth.usernameEnv]?.trim();
  if (!username) {
    throw new Error(
      `Missing ${auth.usernameEnv} for configured auth.usernameEnv.`,
    );
  }

  const password = env[auth.passwordEnv]?.trim();
  if (!password) {
    throw new Error(
      `Missing ${auth.passwordEnv} for configured auth.passwordEnv.`,
    );
  }

  return {
    username,
    password,
    usernameSource: auth.usernameEnv,
    passwordSource: auth.passwordEnv,
  };
}

export function collectSecretValues(secrets: readonly string[]): string[] {
  return [...new Set(secrets.filter((value) => value.length > 0))].sort(
    (left, right) => right.length - left.length,
  );
}

export function redactString(
  value: string,
  secrets: readonly string[],
): string {
  let redacted = value;
  for (const secret of collectSecretValues(secrets)) {
    if (redacted.includes(secret)) {
      redacted = redacted.split(secret).join(REDACTED_SECRET);
    }
  }
  return redacted;
}

export function redactUnknown(
  value: unknown,
  secrets: readonly string[],
): unknown {
  if (typeof value === "string") {
    return redactString(value, secrets);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactUnknown(entry, secrets));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactUnknown(entry, secrets),
      ]),
    );
  }

  return value;
}

export function redactForPersistence<T>(
  value: T,
  secrets: readonly string[],
): T {
  return redactUnknown(value, secrets) as T;
}

export function safeJsonStringify(
  value: unknown,
  secrets: readonly string[],
): string {
  return JSON.stringify(redactForPersistence(value, secrets));
}

export function secretValuesFromAuth(
  auth: ProofAuthConfig,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const values: string[] = [];
  const username = env[auth.usernameEnv]?.trim();
  const password = env[auth.passwordEnv]?.trim();
  if (username) values.push(username);
  if (password) values.push(password);
  return values;
}

import { z } from "zod";

export const MAX_CRITERIA = 10;
export const MAX_ALLOWED_ORIGINS = 5;

export const envVarNameSchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Environment variable names must be uppercase with letters, digits, and underscores.",
  );

export const proofAppConfigSchema = z.object({
  baseUrl: z.url("app.baseUrl must be a valid URL."),
  startCommand: z.string().min(1, "app.startCommand is required."),
  readyPath: z
    .string()
    .min(1, "app.readyPath is required.")
    .refine(
      (value) => value.startsWith("/"),
      "app.readyPath must start with '/'.",
    ),
  allowedOrigins: z
    .array(z.url("Each allowed origin must be a valid URL."))
    .min(1, "app.allowedOrigins requires at least one origin.")
    .max(
      MAX_ALLOWED_ORIGINS,
      `app.allowedOrigins cannot exceed ${MAX_ALLOWED_ORIGINS} entries.`,
    ),
});

export const proofCriteriaConfigSchema = z.object({
  file: z.string().min(1, "criteria.file is required."),
  maxCriteria: z
    .number()
    .int("criteria.maxCriteria must be an integer.")
    .min(1, "criteria.maxCriteria must be at least 1.")
    .max(MAX_CRITERIA, `criteria.maxCriteria cannot exceed ${MAX_CRITERIA}.`),
});

export const proofLimitsConfigSchema = z.object({
  maxSteps: z
    .number()
    .int("limits.maxSteps must be an integer.")
    .min(1)
    .optional(),
  maxDurationMs: z
    .number()
    .int("limits.maxDurationMs must be an integer.")
    .min(1_000)
    .optional(),
  maxInferenceAttempts: z
    .number()
    .int("limits.maxInferenceAttempts must be an integer.")
    .min(1)
    .optional(),
});

export const proofScenarioConfigSchema = z.object({
  module: z
    .string()
    .min(1, "scenario.module must point to a scenario builder file."),
});

export const proofAuthConfigSchema = z.object({
  loginPath: z
    .string()
    .min(1, "auth.loginPath is required.")
    .refine(
      (value) => value.startsWith("/"),
      "auth.loginPath must start with '/'.",
    ),
  usernameEnv: envVarNameSchema,
  passwordEnv: envVarNameSchema,
});

export const proofConfigSchema = z.object({
  app: proofAppConfigSchema,
  criteria: proofCriteriaConfigSchema,
  auth: proofAuthConfigSchema.optional(),
  scenario: proofScenarioConfigSchema.optional(),
  prerequisites: z
    .record(
      z
        .string()
        .regex(/^\d+$/u, "Prerequisite keys must be criterion indices."),
      z.array(z.number().int().min(1)),
    )
    .optional(),
  limits: proofLimitsConfigSchema.optional(),
});

export type ProofAppConfig = z.infer<typeof proofAppConfigSchema>;
export type ProofCriteriaConfig = z.infer<typeof proofCriteriaConfigSchema>;
export type ProofAuthConfig = z.infer<typeof proofAuthConfigSchema>;
export type ProofLimitsConfig = z.infer<typeof proofLimitsConfigSchema>;
export type ProofScenarioConfig = z.infer<typeof proofScenarioConfigSchema>;
export type ProofConfig = z.infer<typeof proofConfigSchema>;

export function formatProofConfigError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "config";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

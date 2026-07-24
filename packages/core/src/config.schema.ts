import { z } from "zod";

export const MAX_CRITERIA = 3;
export const MAX_ALLOWED_ORIGINS = 1;

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
    .length(
      MAX_ALLOWED_ORIGINS,
      `P0 supports exactly ${MAX_ALLOWED_ORIGINS} allowed origin.`,
    ),
});

export const proofCriteriaConfigSchema = z.object({
  file: z.string().min(1, "criteria.file is required."),
  maxCriteria: z
    .number()
    .int("criteria.maxCriteria must be an integer.")
    .min(1, "criteria.maxCriteria must be at least 1.")
    .max(
      MAX_CRITERIA,
      `criteria.maxCriteria cannot exceed the P0 maximum of ${MAX_CRITERIA}.`,
    ),
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
});

export type ProofAppConfig = z.infer<typeof proofAppConfigSchema>;
export type ProofCriteriaConfig = z.infer<typeof proofCriteriaConfigSchema>;
export type ProofAuthConfig = z.infer<typeof proofAuthConfigSchema>;
export type ProofConfig = z.infer<typeof proofConfigSchema>;

export function formatProofConfigError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "config";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

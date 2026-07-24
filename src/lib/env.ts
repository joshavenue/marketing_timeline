import { z } from "zod";

const optionalString = z.string().trim().min(1).optional();

const serverEnvSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().trim().min(1),
    AUTH_SECRET: z.string().min(32),
    APP_ORIGIN: z.url(),
    CREDENTIAL_ENCRYPTION_KEY: z.string().superRefine((value, context) => {
      const decoded = Buffer.from(value, "base64");
      const canonical = decoded.toString("base64");

      if (decoded.length !== 32 || canonical !== value) {
        context.addIssue({
          code: "custom",
          message:
            "CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
        });
      }
    }),
    E2E_TEST_MODE: z.enum(["1"]).optional(),
    E2E_TEST_ADMIN_EMAIL: optionalString,
    E2E_TEST_MEMBER_EMAIL: optionalString,
    AUTH_GOOGLE_ID: optionalString,
    AUTH_GOOGLE_SECRET: optionalString,
    SMTP_URL: optionalString,
    SMTP_FROM: optionalString,
    NOTION_TOKEN: optionalString,
    NOTION_CAMPAIGNS_DATABASE_ID: optionalString,
    NOTION_INITIATIVES_DATABASE_ID: optionalString,
    NOTION_EVENTS_DATABASE_ID: optionalString,
    NOTION_METRICS_DATABASE_ID: optionalString,
    NOTION_OBSERVATIONS_DATABASE_ID: optionalString,
    X_BEARER_TOKEN: optionalString,
    X_ACCESS_TOKEN: optionalString,
    X_ACCESS_TOKEN_SECRET: optionalString,
    X_ADS_ACCOUNT_ID: optionalString,
    PRODUCTION_DOMAIN: optionalString,
    BACKUP_S3_BUCKET: optionalString,
    BACKUP_S3_ENDPOINT: optionalString,
    BACKUP_AGE_RECIPIENT: optionalString,
    BACKUP_AGE_IDENTITY_FILE: optionalString,
  })
  .superRefine((value, context) => {
    if (
      value.E2E_TEST_MODE === "1" &&
      (value.APP_ENV !== "test" ||
        !["localhost", "127.0.0.1"].includes(
          new URL(value.APP_ORIGIN).hostname,
        ))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "E2E_TEST_MODE=1 requires APP_ENV=test and a localhost APP_ORIGIN",
        path: ["E2E_TEST_MODE"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(
  input: Partial<NodeJS.ProcessEnv> = process.env,
): ServerEnv {
  return serverEnvSchema.parse(input);
}

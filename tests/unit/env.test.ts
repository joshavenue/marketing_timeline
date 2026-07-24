import { describe, expect, it } from "vitest";

import { readServerEnv } from "@/lib/env";

describe("readServerEnv", () => {
  it("rejects a missing database URL", () => {
    expect(() => readServerEnv({ AUTH_SECRET: "x".repeat(32) })).toThrow(
      "DATABASE_URL",
    );
  });

  it("accepts the minimum build-time environment", () => {
    const env = readServerEnv({
      DATABASE_URL: "postgres://app:app@localhost:5432/marketing",
      AUTH_SECRET: "x".repeat(32),
      APP_ORIGIN: "http://localhost:3000",
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
    });

    expect(env.APP_ORIGIN).toBe("http://localhost:3000");
  });
});

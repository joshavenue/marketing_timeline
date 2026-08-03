import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    fileParallelism: false,
    env: {
      APP_ENV: "test",
      DATABASE_URL:
        "postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test",
      AUTH_SECRET: "0123456789abcdef0123456789abcdef",
      APP_ORIGIN: "http://127.0.0.1:3000",
      CREDENTIAL_ENCRYPTION_KEY:
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
  },
});

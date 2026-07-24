import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  webServer: {
    command:
      "APP_ENV=test E2E_TEST_MODE=1 E2E_TEST_ADMIN_EMAIL=admin@example.test E2E_TEST_MEMBER_EMAIL=member@example.test pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

import { chromium, type FullConfig } from "@playwright/test";

async function authenticate(
  baseURL: string,
  email: string,
  outputPath: string,
) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/api/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.context().storageState({ path: outputPath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required");
  }

  await authenticate(baseURL, "admin@example.test", "test-results/admin.json");
  await authenticate(baseURL, "member@example.test", "test-results/member.json");
}

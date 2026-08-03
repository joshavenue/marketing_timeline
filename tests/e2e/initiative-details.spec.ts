import { expect, test } from "@playwright/test";

test("initiative evidence is deep-linkable and cited", async ({ page }) => {
  await page.goto("/timeline?zoom=month&query=Active");
  await page
    .getByRole("link", { name: /Active initiative.*Open evidence/ })
    .click();

  await expect(page).toHaveURL(/initiative=/);
  await expect(page.getByRole("dialog", { name: "Initiative details" })).toBeVisible();
  await page.getByRole("link", { name: "Open full page" }).click();
  await expect(page).toHaveURL(/\/initiatives\//);
  await expect(
    page.getByRole("heading", { name: "Active initiative" }),
  ).toBeVisible();
  await expect(page.getByText("Planned budget")).toBeVisible();
  await expect(page.getByText("Token Pre-Sales social posting")).toBeVisible();
  await expect(page.getByText("raw", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("calculated", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View citation" }).first()).toHaveAttribute(
    "href",
    "https://analytics.x.com/example-post",
  );

  await page.getByRole("link", { name: "Back to timeline" }).click();
  await expect(page).toHaveURL("/timeline?zoom=month&query=Active");
});

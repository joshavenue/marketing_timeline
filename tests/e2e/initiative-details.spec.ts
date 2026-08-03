import { expect, test } from "@playwright/test";

test("initiative evidence is deep-linkable and cited", async ({ page }) => {
  await page.goto("/timeline?zoom=month&query=Active");
  await page
    .getByRole("link", { name: /Active initiative.*Open evidence/ })
    .click();

  await expect(page).toHaveURL(/initiative=/);
  const dialog = page.getByRole("dialog", { name: "Initiative details" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const drawer = page.getByTestId("initiative-drawer");
  const drawerBox = await drawer.boundingBox();
  const viewport = page.viewportSize();
  expect(drawerBox?.width).toBeGreaterThanOrEqual(520);
  expect(drawerBox?.width).toBeLessThanOrEqual(600);
  expect(Math.round((drawerBox?.x ?? 0) + (drawerBox?.width ?? 0))).toBe(
    viewport?.width,
  );
  await expect(
    dialog.getByRole("heading", { name: "Active initiative" }),
  ).toBeVisible();
  await expect(dialog.getByText("Performance evidence")).toBeVisible();
  await expect(dialog.getByText("25,000", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Contributions")).toBeVisible();
  await expect(dialog.getByText("Source provenance")).toBeVisible();
  await expect(dialog.getByText("Team interpretation")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Close" })).toBeVisible();
  await page.getByRole("link", { name: "Open full page" }).click();
  await expect(page).toHaveURL(/\/initiatives\//);
  await expect(
    page.getByRole("heading", { name: "Active initiative" }),
  ).toBeVisible();
  await expect(page.getByText("Planned budget")).toBeVisible();
  await expect(page.getByText("Token Pre-Sales social posting")).toBeVisible();
  await expect(page.getByText("Raw source", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Calculated", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View citation" }).first()).toHaveAttribute(
    "href",
    "https://analytics.x.com/example-post",
  );

  await page.getByRole("link", { name: "Back to timeline" }).click();
  await expect(page).toHaveURL("/timeline?zoom=month&query=Active");
});

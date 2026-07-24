import { expect, test } from "@playwright/test";

test("registered members can comment and reply on an initiative", async ({
  page,
}) => {
  await page.goto("/timeline?query=Active");
  await page
    .getByRole("link", { name: /Active initiative.*Open evidence/ })
    .click();

  await page.getByPlaceholder("Add a team note…").fill("Review launch outcomes.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Review launch outcomes.")).toBeVisible();

  await page.getByRole("button", { name: "Reply" }).click();
  await page.getByPlaceholder("Add a team note…").fill("Outcome review complete.");
  await page.getByRole("button", { name: "Post reply" }).click();
  await expect(page.getByText("Outcome review complete.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Review launch outcomes.")).toBeVisible();
  await expect(page.getByText("Outcome review complete.")).toBeVisible();
});

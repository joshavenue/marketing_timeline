import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { TEST_DATABASE_URL } from "../helpers/database";

process.env.DATABASE_URL = TEST_DATABASE_URL;

test.describe("historical timeline", () => {
  test("centers today and supports scrolling, zoom, filters, and viewport restore", async ({
    page,
  }) => {
    await page.goto("/timeline");

    await expect(
      page.getByRole("link", { name: "Marketing Timeline" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Past → present → future")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Campaign" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Status" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Contributor" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Quarter" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
    const jumpToToday = page.getByRole("button", { name: "Jump to today" });
    await jumpToToday.focus();
    await expect(jumpToToday).toBeFocused();

    const scroller = page.getByTestId("timeline-scroll");
    await expect(page.getByTestId("today-marker")).toBeVisible();
    await expect(page.getByTestId("campaign-band")).toHaveCount(1);
    await expect(page.getByTestId("timeline-marker")).toHaveCount(3);
    await expect(page.getByTestId("campaign-band")).toContainText(
      "Growth campaign",
    );
    await expect(page.getByText("Company growth context")).toBeVisible();
    await expect(page.getByText("Raw observation")).toBeVisible();
    await expect(page.getByText("No recorded value")).toBeVisible();
    await expect(page.getByText("Frozen after 7 days")).toBeVisible();
    await expect(
      page.getByText(
        "Timing alignment supports human interpretation and does not prove causation.",
      ),
    ).toBeVisible();
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    await scroller.evaluate((element) => {
      element.scrollLeft += 180;
      element.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(650);
    const savedPosition = await scroller.evaluate(
      (element) => element.scrollLeft,
    );
    await expect
      .poll(async () => {
        const [preference] = await db
          .select({ value: userPreferences.valueJson })
          .from(userPreferences)
          .where(eq(userPreferences.key, "timeline.viewport"))
          .limit(1);
        return (
          preference?.value as { scrollLeft?: number } | undefined
        )?.scrollLeft;
      })
      .toBeCloseTo(savedPosition, 0);
    await page.reload();
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollLeft))
      .toBeCloseTo(savedPosition, 0);

    await page
      .getByRole("link", { name: "Show related events for Active initiative" })
      .click();
    await expect(page).toHaveURL(/expanded=/);
    await expect(page.getByText("Token Pre-Sales social posting")).toBeVisible();

    await page.getByRole("link", { name: "Month" }).click();
    await expect(page).toHaveURL(/zoom=month/);

    await page.getByPlaceholder("Search initiatives…").fill("Future initiative");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByTestId("timeline-marker")).toHaveCount(1);
    await expect(page.getByText("Future initiative")).toBeVisible();
  });
});

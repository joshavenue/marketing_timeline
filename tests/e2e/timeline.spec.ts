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

    const scroller = page.getByTestId("timeline-scroll");
    await expect(page.getByTestId("today-marker")).toBeVisible();
    await expect(page.getByTestId("timeline-marker")).toHaveCount(4);
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

    await page.getByRole("link", { name: "Month" }).click();
    await expect(page).toHaveURL(/zoom=month/);

    await page.getByPlaceholder("Search initiatives…").fill("Future initiative");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByTestId("timeline-marker")).toHaveCount(1);
    await expect(page.getByText("Future initiative")).toBeVisible();
  });
});

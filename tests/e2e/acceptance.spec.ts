import { expect, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  connections,
  initiatives,
  refreshJobItems,
  sourceSnapshots,
  users,
} from "@/db/schema";
import { TEST_DATABASE_URL } from "../helpers/database";

process.env.DATABASE_URL = TEST_DATABASE_URL;

test("master acceptance criteria 1 through 19", async ({ browser, page }) => {
  test.setTimeout(90_000);
  await test.step("invited access succeeds and uninvited access fails", async () => {
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: "Marketing history" })).toBeVisible();

    const intruder = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      storageState: { cookies: [], origins: [] },
    });
    const csrf = await intruder.request.get("/api/auth/csrf");
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    await intruder.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "uninvited@example.test",
        callbackUrl: "http://127.0.0.1:3000/timeline",
        json: "true",
      },
    });
    const intruderPage = await intruder.newPage();
    await intruderPage.goto("/timeline");
    await expect(intruderPage).toHaveURL(/\/login/);
    await intruder.close();
  });

  await test.step("published curation controls the historical timeline", async () => {
    await page.goto("/timeline?zoom=quarter");
    await expect(page.getByText("Active initiative", { exact: true })).toBeVisible();
    await expect(page.getByText("Draft initiative", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Token Pre-Sales social posting")).toHaveCount(0);
    await page.getByRole("link", { name: "month" }).click();
    await expect(page.getByText("Token Pre-Sales social posting")).toBeVisible();
  });

  await test.step("invalid Notion records expose corrective action", async () => {
    await page.goto("/settings/notion");
    await expect(page.getByText("invalid-published-record")).toBeVisible();
    await expect(page.getByText(/Start date is required/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Correct in Notion" })).toHaveAttribute(
      "href",
      "https://www.notion.so/invalid-record",
    );
  });

  let activeInitiativeId = "";
  await test.step("drawer and full evidence page preserve timeline context", async () => {
    await page.goto("/timeline?zoom=month&query=Active");
    const marker = page.getByRole("link", {
      name: /Active initiative.*Open evidence/,
    });
    await marker.click();
    await expect(page).toHaveURL(/initiative=/);
    await expect(page.getByRole("dialog", { name: "Initiative details" })).toBeVisible();
    await page.getByRole("link", { name: "Open full page" }).click();
    await expect(page).toHaveURL(/\/initiatives\/[0-9a-f-]{36}/);
    activeInitiativeId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(page.getByText("Planned budget")).toBeVisible();
    await expect(page.getByText("Token Pre-Sales social posting")).toBeVisible();
    await expect(page.getByText("Raw source", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Calculated", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Inputs: actual=820, planned=1000")).toBeVisible();
    await expect(page.getByRole("link", { name: "View citation" }).first()).toBeVisible();
    await expect(page.getByText(/Last read/)).toBeVisible();
    await expect(page.getByText(/Version 2/)).toBeVisible();
    await page.getByRole("link", { name: "Back to timeline" }).click();
    await expect(page).toHaveURL("/timeline?zoom=month&query=Active");
  });

  await test.step("deleted Notion evidence remains archived and flagged", async () => {
    await page.goto("/timeline?query=Past");
    await page.getByRole("link", { name: /Past initiative.*Open evidence/ }).click();
    await expect(page.getByText(/Source state:/)).toContainText("deleted");
  });

  await test.step("three X contexts are separate and cached-only", async () => {
    const [{ count: before }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sourceSnapshots);
    for (const [context, heading] of [
      ["post", "X post analytics"],
      ["account", "X account analytics"],
      ["ads", "X Ads analytics"],
    ]) {
      await page.goto(`/analytics/x/${context}`);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText(/Cached evidence only/)).toBeVisible();
    }
    const [{ count: after }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sourceSnapshots);
    expect(Number(after)).toBe(Number(before));
  });

  await test.step("refresh preview shows scope, cost, caps, and freeze exclusions", async () => {
    const [xPost] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(eq(connections.connectorKey, "x_post"))
      .limit(1);
    const response = await page.request.post("/api/jobs/preflight", {
      data: {
        connectionId: xPost!.id,
        objects: [
          { externalObjectId: "eligible-post" },
          {
            externalObjectId: "frozen-post",
            observedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      },
    });
    expect(response.status()).toBe(200);
    const { preflight } = (await response.json()) as {
      preflight: {
        eligible: unknown[];
        frozen: unknown[];
        operationCount: number;
        estimatedCostMicros: number;
        periodUsageMicros: number;
        remainingCapMicros: number;
      };
    };
    expect(preflight.eligible).toHaveLength(1);
    expect(preflight.frozen).toHaveLength(1);
    expect(preflight.operationCount).toBe(1);
    expect(preflight.estimatedCostMicros).toBe(10);
    expect(preflight.periodUsageMicros).toBe(20);
    expect(preflight.remainingCapMicros).toBe(80);

    await page.goto("/settings/connections");
    await page.getByLabel("Refresh connection").selectOption(xPost!.id);
    await page.getByLabel("External object ID").fill("frozen-post");
    await page.getByLabel("Source observation timestamp").fill("2026-07-01T00:00");
    await page.getByRole("button", { name: "Preview manual read" }).click();
    await expect(page.getByText("0 / 1 / 0")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm and queue read" })).toBeDisabled();
  });

  await test.step("frozen reads and member administration are blocked", async () => {
    const [xPost] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(eq(connections.connectorKey, "x_post"))
      .limit(1);
    const [{ count: before }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(refreshJobItems);
    const frozen = await page.request.post("/api/jobs", {
      data: {
        connectionId: xPost!.id,
        objects: [{
          externalObjectId: "frozen-post",
          observedAt: "2026-07-01T00:00:00.000Z",
        }],
      },
    });
    expect(frozen.status()).toBe(400);
    const [{ count: after }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(refreshJobItems);
    expect(Number(after)).toBe(Number(before));

    const member = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      storageState: "test-results/member.json",
    });
    expect(
      (
        await member.request.post("/api/jobs/preflight", {
          data: {
            connectionId: xPost!.id,
            objects: [{ externalObjectId: "post" }],
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await member.request.post("/api/settings/connections", {
          data: {
            connectorKey: "notion",
            name: "Forbidden",
            credential: "secret",
            confirmed: true,
          },
        })
      ).status(),
    ).toBe(403);
    await member.close();
  });

  await test.step("comments, replies, mentions, notifications, and audit work", async () => {
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "member@example.test"))
      .limit(1);
    if (!activeInitiativeId) {
      const [active] = await db
        .select({ id: initiatives.id })
        .from(initiatives)
        .where(
          and(
            eq(initiatives.externalId, "e2e-active"),
            eq(initiatives.publicationStatus, "published"),
          ),
        )
        .limit(1);
      activeInitiativeId = active!.id;
    }
    const topLevel = await page.request.post("/api/comments", {
      data: {
        entityType: "initiative",
        entityId: activeInitiativeId,
        body: `Please review @[Member](user:${member!.id})`,
      },
    });
    const topLevelPayload = (await topLevel.json()) as {
      comment?: { id: string };
      error?: string;
    };
    expect(topLevel.status(), topLevelPayload.error).toBe(201);
    const comment = topLevelPayload.comment!;
    expect(
      (
        await page.request.post("/api/comments", {
          data: {
            entityType: "initiative",
            entityId: activeInitiativeId,
            parentCommentId: comment.id,
            body: "One-level reply.",
          },
        })
      ).status(),
    ).toBe(201);

    const memberContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      storageState: "test-results/member.json",
    });
    const memberPage = await memberContext.newPage();
    await memberPage.goto("/notifications");
    await expect(memberPage.getByText("You were mentioned in a comment.")).toBeVisible();
    await memberContext.close();

    await page.goto("/settings/audit");
    await expect(page.getByText("notion.sync.completed")).toBeVisible();
  });
});

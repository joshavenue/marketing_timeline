import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";

import { db } from "@/db/client";
import {
  campaigns,
  initiatives,
  memberships,
  users,
} from "@/db/schema";
import { createWorkspace } from "@/db/queries/workspaces";
import { resetDatabase, TEST_DATABASE_URL } from "../helpers/database";

async function authenticate(
  baseURL: string,
  email: string,
  outputPath: string,
) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const csrfResponse = await page.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  await page.request.post(`${baseURL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email,
      callbackUrl: `${baseURL}/timeline`,
      json: "true",
    },
  });
  await page.goto(`${baseURL}/timeline`);
  await page.context().storageState({ path: outputPath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required");
  }

  await resetDatabase();
  const workspace = await createWorkspace("Tessera Lab");
  const seededUsers = await db
    .insert(users)
    .values([
      { email: "admin@example.test", name: "Admin" },
      { email: "member@example.test", name: "Member" },
    ])
    .returning({ id: users.id, email: users.email });
  await db.insert(memberships).values(
    seededUsers.map((user) => ({
      workspaceId: workspace.id,
      userId: user.id,
      role: user.email.startsWith("admin") ? ("admin" as const) : ("member" as const),
      active: true,
    })),
  );
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const value = new Date(today);
    value.setUTCDate(value.getUTCDate() + days);
    return iso(value);
  };
  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      externalId: "e2e-campaign",
      name: "Growth campaign",
      lifecycleStatus: "Active",
      publicationStatus: "published",
      startDate: shift(-180),
      endDate: shift(180),
      displayLevel: "primary",
      sourceUrlsJson: [],
    })
    .returning({ id: campaigns.id });
  await db.insert(initiatives).values([
    {
      workspaceId: workspace.id,
      externalId: "e2e-past",
      campaignId: campaign!.id,
      name: "Past initiative",
      lifecycleStatus: "Complete",
      publicationStatus: "published",
      startDate: shift(-90),
      displayLevel: "primary",
      sourceUrlsJson: [],
    },
    {
      workspaceId: workspace.id,
      externalId: "e2e-active",
      campaignId: campaign!.id,
      name: "Active initiative",
      lifecycleStatus: "Active",
      publicationStatus: "published",
      startDate: shift(-7),
      endDate: shift(7),
      displayLevel: "primary",
      sourceUrlsJson: [],
    },
    {
      workspaceId: workspace.id,
      externalId: "e2e-future",
      campaignId: campaign!.id,
      name: "Future initiative",
      lifecycleStatus: "Planned",
      publicationStatus: "published",
      startDate: shift(90),
      displayLevel: "primary",
      sourceUrlsJson: [],
    },
  ]);

  await mkdir("test-results", { recursive: true });
  await authenticate(baseURL, "admin@example.test", "test-results/admin.json");
  await authenticate(baseURL, "member@example.test", "test-results/member.json");
}

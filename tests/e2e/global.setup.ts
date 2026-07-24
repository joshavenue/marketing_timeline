import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";

import { db } from "@/db/client";
import {
  campaigns,
  connections,
  initiativeMetrics,
  initiatives,
  memberships,
  metricDefinitions,
  metricObservations,
  sourceSnapshots,
  timelineEventContributors,
  timelineEvents,
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
  const seededInitiatives = await db.insert(initiatives).values([
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
      ownerName: "Person A",
      plannedBudget: "1000",
      actualSpend: "820",
      overview: "Launch the token pre-sales story across social channels.",
      displayLevel: "primary",
      sourceUrlsJson: ["https://www.notion.so/example-initiative"],
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
  ]).returning({ id: initiatives.id, externalId: initiatives.externalId });
  const active = seededInitiatives.find(
    (initiative) => initiative.externalId === "e2e-active",
  )!;
  const [event] = await db.insert(timelineEvents).values({
    workspaceId: workspace.id,
    externalId: "e2e-active-post",
    initiativeId: active.id,
    title: "Token Pre-Sales social posting",
    kind: "post",
    publicationStatus: "published",
    startDate: shift(-6),
    displayLevel: "nested",
    sourceUrlsJson: [],
    externalUrlsJson: [],
  }).returning({ id: timelineEvents.id });
  await db.insert(timelineEventContributors).values({
    workspaceId: workspace.id,
    eventId: event!.id,
    contributorName: "Person A",
  });
  const [connection] = await db.insert(connections).values({
    workspaceId: workspace.id,
    connectorKey: "notion",
    name: "E2E Notion",
    usagePeriodStart: iso(today),
  }).returning({ id: connections.id });
  const [snapshot] = await db.insert(sourceSnapshots).values({
    workspaceId: workspace.id,
    connectionId: connection!.id,
    externalObjectId: "e2e-active",
    operationKey: "query",
    requestScopeJson: {},
    requestChecksum: "request-e2e",
    responseJson: {},
    checksum: "response-e2e",
    observedAt: today,
  }).returning({ id: sourceSnapshots.id });
  const definitions = await db.insert(metricDefinitions).values([
    {
      workspaceId: workspace.id,
      externalId: "e2e-impressions",
      name: "Post impressions",
      kind: "raw",
      connectorKey: "x_post",
      connectionName: "X posts",
      externalMetricKey: "impressions",
      unit: "views",
      aggregation: "sum",
      publicationStatus: "published",
    },
    {
      workspaceId: workspace.id,
      externalId: "e2e-engagement-rate",
      name: "Engagement rate",
      kind: "calculated",
      connectorKey: "x_post",
      connectionName: "X posts",
      externalMetricKey: "engagement_rate",
      unit: "ratio",
      aggregation: "formula",
      formulaKey: "engagement_rate",
      publicationStatus: "published",
    },
  ]).returning({ id: metricDefinitions.id, externalId: metricDefinitions.externalId });
  await db.insert(initiativeMetrics).values(
    definitions.map((definition) => ({
      workspaceId: workspace.id,
      initiativeId: active.id,
      metricDefinitionId: definition.id,
    })),
  );
  await db.insert(metricObservations).values(
    definitions.map((definition, index) => ({
      workspaceId: workspace.id,
      metricDefinitionId: definition.id,
      initiativeId: active.id,
      sourceSnapshotId: snapshot!.id,
      periodStart: new Date(`${shift(-7)}T00:00:00Z`),
      periodEnd: new Date(`${shift(7)}T00:00:00Z`),
      value: index === 0 ? "12500" : "0.042",
      unit: index === 0 ? "views" : "ratio",
      freshness: "fresh" as const,
      sourceUrl: "https://analytics.x.com/example-post",
      observedAt: today,
    })),
  );

  await mkdir("test-results", { recursive: true });
  await authenticate(baseURL, "admin@example.test", "test-results/admin.json");
  await authenticate(baseURL, "member@example.test", "test-results/member.json");
}

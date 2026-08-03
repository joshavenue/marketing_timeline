import { Client } from "@notionhq/client";

import type { CanonicalPage } from "@/lib/notion/canonical";

export interface CanonicalNotionDatabaseIds {
  campaigns: string;
  initiatives: string;
  events: string;
  metrics: string;
  observations: string;
}

export interface ReadCanonicalNotionPagesInput {
  token: string;
  databaseIds: CanonicalNotionDatabaseIds;
}

type PageRecord = {
  id: string;
  url: string;
  properties: Record<string, unknown>;
};

type PropertyRecord = Record<string, unknown>;

function property(page: PageRecord, name: string): PropertyRecord {
  const value = page.properties[name];
  return value && typeof value === "object"
    ? (value as PropertyRecord)
    : {};
}

function richTextValue(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as PropertyRecord;
      return typeof record.plain_text === "string" ? record.plain_text : "";
    })
    .join("")
    .trim();
}

function title(page: PageRecord, name: string) {
  return richTextValue(property(page, name).title);
}

function richText(page: PageRecord, name: string) {
  return richTextValue(property(page, name).rich_text);
}

function status(page: PageRecord, name: string) {
  const value = property(page, name).status;
  return value && typeof value === "object"
    ? String((value as PropertyRecord).name ?? "")
    : "";
}

function select(page: PageRecord, name: string) {
  const value = property(page, name).select;
  return value && typeof value === "object"
    ? String((value as PropertyRecord).name ?? "")
    : "";
}

function dateRange(page: PageRecord, name: string) {
  const value = property(page, name).date;
  if (!value || typeof value !== "object") {
    return { start: "", end: null };
  }
  const record = value as PropertyRecord;
  return {
    start: typeof record.start === "string" ? record.start.slice(0, 10) : "",
    end:
      typeof record.end === "string" ? record.end.slice(0, 10) : null,
  };
}

function numberValue(page: PageRecord, name: string) {
  const value = property(page, name).number;
  return typeof value === "number" ? value : null;
}

function relationIds(page: PageRecord, name: string) {
  const value = property(page, name).relation;
  if (!Array.isArray(value)) return [];
  return value.flatMap((relation) => {
    if (!relation || typeof relation !== "object") return [];
    const id = (relation as PropertyRecord).id;
    return typeof id === "string" ? [id] : [];
  });
}

function people(page: PageRecord, name: string) {
  const value = property(page, name).people;
  if (!Array.isArray(value)) return [];
  return value.flatMap((person) => {
    if (!person || typeof person !== "object") return [];
    const record = person as PropertyRecord;
    const id = typeof record.id === "string" ? record.id : null;
    const displayName =
      typeof record.name === "string"
        ? record.name
        : typeof record.person === "object" &&
            record.person &&
            typeof (record.person as PropertyRecord).email === "string"
          ? String((record.person as PropertyRecord).email)
          : id;
    return displayName
      ? [{ name: displayName, notionUserId: id }]
      : [];
  });
}

function urlsFromRichText(page: PageRecord, name: string) {
  const text = richText(page, name);
  return text.match(/https?:\/\/[^\s,]+/g) ?? [];
}

function mapCampaign(page: PageRecord): CanonicalPage {
  const dates = dateRange(page, "Start Date");
  const explicitEnd = dateRange(page, "End Date").start || dates.end;
  return {
    recordType: "campaign",
    sourceId: page.id,
    sourceUrl: page.url,
    name: title(page, "Campaign"),
    lifecycleStatus: status(page, "Lifecycle Status"),
    publicationStatus: status(page, "Publication Status") as
      | "Draft"
      | "Ready for Review"
      | "Published",
    startDate: dates.start,
    endDate: explicitEnd || null,
    ownerName: people(page, "Owner")[0]?.name ?? null,
    objective: richText(page, "Objective") || null,
    displayLevel: select(page, "Display Level") as
      | "Primary marker"
      | "Nested activity"
      | "Detail only",
    sourceRecordUrls: urlsFromRichText(page, "Source Records"),
  };
}

function mapInitiative(page: PageRecord): CanonicalPage {
  const dates = dateRange(page, "Start Date");
  const explicitEnd = dateRange(page, "End Date").start || dates.end;
  return {
    recordType: "initiative",
    sourceId: page.id,
    sourceUrl: page.url,
    name: title(page, "Initiative"),
    campaignExternalId: relationIds(page, "Campaign")[0] ?? "",
    lifecycleStatus: status(page, "Lifecycle Status"),
    publicationStatus: status(page, "Publication Status") as
      | "Draft"
      | "Ready for Review"
      | "Published",
    startDate: dates.start,
    endDate: explicitEnd || null,
    ownerName: people(page, "Owner")[0]?.name ?? null,
    plannedBudget: numberValue(page, "Planned Budget"),
    actualSpend: numberValue(page, "Actual Spend"),
    overview: richText(page, "Overview") || null,
    attributionTemplate: select(page, "Attribution Template") || null,
    displayLevel: select(page, "Display Level") as
      | "Primary marker"
      | "Nested activity"
      | "Detail only",
    sourceRecordUrls: urlsFromRichText(page, "Source Records"),
  };
}

function mapEvent(page: PageRecord): CanonicalPage {
  const dates = dateRange(page, "Start Date");
  const explicitEnd = dateRange(page, "End Date").start || dates.end;
  return {
    recordType: "event",
    sourceId: page.id,
    sourceUrl: page.url,
    title: title(page, "Event / Work Performed"),
    initiativeExternalId: relationIds(page, "Initiative")[0] ?? "",
    eventType: select(page, "Event Type") as
      | "Activity"
      | "Post"
      | "Milestone"
      | "Launch"
      | "Outcome"
      | "Other",
    publicationStatus: status(page, "Publication Status") as
      | "Draft"
      | "Ready for Review"
      | "Published",
    startDate: dates.start,
    endDate: explicitEnd || null,
    contributors: people(page, "Contributors"),
    context: richText(page, "Context") || null,
    externalObjectUrls: urlsFromRichText(page, "External Object URLs"),
    sourceRecordUrls: urlsFromRichText(page, "Source Records"),
    displayLevel: select(page, "Display Level") as
      | "Primary marker"
      | "Nested activity"
      | "Detail only",
  };
}

function mapMetric(page: PageRecord): CanonicalPage {
  return {
    recordType: "metric_definition",
    sourceId: page.id,
    sourceUrl: page.url,
    name: title(page, "Metric"),
    metricType: select(page, "Metric Type") as "Raw source" | "Calculated",
    connectorType: select(page, "Connector Type") as
      | "Notion"
      | "X Post"
      | "X Account"
      | "X Ads",
    connectionName: richText(page, "Named Connection"),
    externalMetricKey: richText(page, "External Metric Key"),
    unit: select(page, "Unit") || richText(page, "Unit"),
    aggregation: select(page, "Aggregation"),
    target: numberValue(page, "Target"),
    relatedCampaignExternalIds: relationIds(page, "Related Campaigns"),
    relatedInitiativeExternalIds: relationIds(page, "Related Initiatives"),
    attributionTemplate: select(page, "Attribution Template") || null,
    overrideWindowDays: numberValue(page, "Override Window Days"),
    formulaKey: select(page, "Formula") || null,
    publicationStatus: status(page, "Publication Status") as
      | "Draft"
      | "Ready for Review"
      | "Published",
    sourceRecordUrls: [page.url],
  };
}

function mapObservation(page: PageRecord): CanonicalPage {
  const periodStart = dateRange(page, "Period Start").start;
  const periodEnd = dateRange(page, "Period End").start || periodStart;
  const sourceReferenceProperty = property(page, "Source Reference").url;
  return {
    recordType: "observation",
    sourceId: page.id,
    sourceUrl: page.url,
    title: title(page, "Observation"),
    metricExternalId: relationIds(page, "Metric")[0] ?? "",
    initiativeExternalId: relationIds(page, "Initiative")[0] ?? null,
    periodStart,
    periodEnd,
    value: numberValue(page, "Value") ?? Number.NaN,
    unit: richText(page, "Unit") || "custom",
    sourceReference:
      typeof sourceReferenceProperty === "string"
        ? sourceReferenceProperty
        : page.url,
    notes: richText(page, "Notes") || null,
    publicationStatus: status(page, "Publication Status") as
      | "Draft"
      | "Ready for Review"
      | "Published",
    sourceRecordUrls: [page.url],
  };
}

async function queryAll(client: Client, dataSourceId: string) {
  const pages: PageRecord[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const result of response.results) {
      if (
        result.object === "page" &&
        "properties" in result &&
        "url" in result
      ) {
        pages.push(result as PageRecord);
      }
    }
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}

export async function readCanonicalNotionPages(
  input: ReadCanonicalNotionPagesInput,
): Promise<unknown[]> {
  const client = new Client({ auth: input.token, retry: false });
  const [campaigns, initiatives, events, metrics, observations] =
    await Promise.all([
      queryAll(client, input.databaseIds.campaigns),
      queryAll(client, input.databaseIds.initiatives),
      queryAll(client, input.databaseIds.events),
      queryAll(client, input.databaseIds.metrics),
      queryAll(client, input.databaseIds.observations),
    ]);

  return [
    ...campaigns.map(mapCampaign),
    ...initiatives.map(mapInitiative),
    ...events.map(mapEvent),
    ...metrics.map(mapMetric),
    ...observations.map(mapObservation),
  ];
}

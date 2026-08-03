import { z } from "zod";

import type {
  ConnectorKey,
  DisplayLevel,
  MetricKind,
  PublicationStatus,
  TimelineKind,
} from "@/domain/contracts";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date");
const sourceFields = {
  sourceId: z.string().trim().min(1),
  sourceUrl: z.url(),
  publicationStatus: z.enum(["Draft", "Ready for Review", "Published"]),
  sourceRecordUrls: z.array(z.url()).default([]),
};
const lifecycleStatus = z.string().trim().min(1);
const displayLevel = z.enum([
  "Primary marker",
  "Nested activity",
  "Detail only",
]);

export const canonicalPageSchema = z.discriminatedUnion("recordType", [
  z.object({
    recordType: z.literal("campaign"),
    ...sourceFields,
    name: z.string().trim().min(1),
    lifecycleStatus,
    startDate: dateString,
    endDate: dateString.nullish(),
    ownerName: z.string().trim().nullish(),
    objective: z.string().trim().nullish(),
    displayLevel,
  }),
  z.object({
    recordType: z.literal("initiative"),
    ...sourceFields,
    name: z.string().trim().min(1),
    campaignExternalId: z.string().trim().min(1),
    lifecycleStatus,
    startDate: dateString,
    endDate: dateString.nullish(),
    ownerName: z.string().trim().nullish(),
    plannedBudget: z.number().nonnegative().nullish(),
    actualSpend: z.number().nonnegative().nullish(),
    overview: z.string().trim().nullish(),
    attributionTemplate: z.string().trim().nullish(),
    displayLevel,
  }),
  z.object({
    recordType: z.literal("event"),
    ...sourceFields,
    title: z.string().trim().min(1),
    initiativeExternalId: z.string().trim().min(1),
    eventType: z.enum([
      "Activity",
      "Post",
      "Milestone",
      "Launch",
      "Outcome",
      "Other",
    ]),
    startDate: dateString,
    endDate: dateString.nullish(),
    contributors: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          notionUserId: z.string().trim().nullish(),
        }),
      )
      .default([]),
    context: z.string().trim().nullish(),
    externalObjectUrls: z.array(z.url()).default([]),
    displayLevel,
  }),
  z.object({
    recordType: z.literal("metric_definition"),
    ...sourceFields,
    name: z.string().trim().min(1),
    metricType: z.enum(["Raw source", "Calculated"]),
    connectorType: z.enum(["Notion", "X Post", "X Account", "X Ads"]),
    connectionName: z.string().trim().min(1),
    externalMetricKey: z.string().trim().min(1),
    unit: z.string().trim().min(1),
    aggregation: z.string().trim().min(1),
    target: z.number().nullish(),
    relatedCampaignExternalIds: z.array(z.string().trim().min(1)).default([]),
    relatedInitiativeExternalIds: z
      .array(z.string().trim().min(1))
      .default([]),
    attributionTemplate: z.string().trim().nullish(),
    overrideWindowDays: z.number().int().nonnegative().nullish(),
    formulaKey: z.string().trim().nullish(),
  }),
  z.object({
    recordType: z.literal("observation"),
    ...sourceFields,
    title: z.string().trim().min(1),
    metricExternalId: z.string().trim().min(1),
    initiativeExternalId: z.string().trim().nullish(),
    periodStart: dateString,
    periodEnd: dateString,
    value: z.number().finite(),
    unit: z.string().trim().min(1),
    sourceReference: z.url(),
    notes: z.string().trim().nullish(),
  }),
]);

export type CanonicalPage = z.infer<typeof canonicalPageSchema>;

interface CanonicalBase {
  type: CanonicalPage["recordType"];
  externalId: string;
  sourceUrl: string;
  publicationStatus: PublicationStatus;
  sourceRecordUrls: string[];
  lifecycleStatus: string | null;
}

export interface CanonicalCampaign extends CanonicalBase {
  type: "campaign";
  name: string;
  lifecycleStatus: string;
  startDate: string;
  endDate: string | null;
  ownerName: string | null;
  objective: string | null;
  displayLevel: DisplayLevel;
}

export interface CanonicalInitiative extends CanonicalBase {
  type: "initiative";
  name: string;
  campaignExternalId: string;
  lifecycleStatus: string;
  startDate: string;
  endDate: string | null;
  ownerName: string | null;
  plannedBudget: number | null;
  actualSpend: number | null;
  overview: string | null;
  attributionTemplate: string | null;
  displayLevel: DisplayLevel;
}

export interface CanonicalEvent extends CanonicalBase {
  type: "event";
  title: string;
  initiativeExternalId: string;
  kind: TimelineKind;
  startDate: string;
  endDate: string | null;
  contributors: Array<{ name: string; notionUserId: string | null }>;
  context: string | null;
  externalObjectUrls: string[];
  displayLevel: DisplayLevel;
}

export interface CanonicalMetricDefinition extends CanonicalBase {
  type: "metric_definition";
  name: string;
  kind: MetricKind;
  connectorKey: ConnectorKey;
  connectionName: string;
  externalMetricKey: string;
  unit: string;
  aggregation: string;
  target: number | null;
  relatedCampaignExternalIds: string[];
  relatedInitiativeExternalIds: string[];
  attributionTemplate: string | null;
  overrideWindowDays: number | null;
  formulaKey: string | null;
}

export interface CanonicalObservation extends CanonicalBase {
  type: "observation";
  title: string;
  metricExternalId: string;
  initiativeExternalId: string | null;
  periodStart: string;
  periodEnd: string;
  value: number;
  unit: string;
  sourceReference: string;
  notes: string | null;
}

export type CanonicalRecord =
  | CanonicalCampaign
  | CanonicalInitiative
  | CanonicalEvent
  | CanonicalMetricDefinition
  | CanonicalObservation;

const publicationMap = {
  Draft: "draft",
  "Ready for Review": "ready",
  Published: "published",
} as const;
const displayMap = {
  "Primary marker": "primary",
  "Nested activity": "nested",
  "Detail only": "detail",
} as const;
const eventKindMap = {
  Activity: "activity",
  Post: "post",
  Milestone: "milestone",
  Launch: "launch",
  Outcome: "outcome",
  Other: "other",
} as const;
const connectorMap = {
  Notion: "notion",
  "X Post": "x_post",
  "X Account": "x_account",
  "X Ads": "x_ads",
} as const;

export function normalizeCanonicalPage(page: CanonicalPage): CanonicalRecord {
  const base = {
    externalId: page.sourceId.replaceAll("-", ""),
    sourceUrl: page.sourceUrl,
    publicationStatus: publicationMap[page.publicationStatus],
    sourceRecordUrls: page.sourceRecordUrls,
    lifecycleStatus:
      "lifecycleStatus" in page ? page.lifecycleStatus : null,
  };

  switch (page.recordType) {
    case "campaign":
      return {
        ...base,
        type: "campaign",
        name: page.name,
        lifecycleStatus: page.lifecycleStatus,
        startDate: page.startDate,
        endDate: page.endDate ?? null,
        ownerName: page.ownerName ?? null,
        objective: page.objective ?? null,
        displayLevel: displayMap[page.displayLevel],
      };
    case "initiative":
      return {
        ...base,
        type: "initiative",
        name: page.name,
        campaignExternalId: page.campaignExternalId.replaceAll("-", ""),
        lifecycleStatus: page.lifecycleStatus,
        startDate: page.startDate,
        endDate: page.endDate ?? null,
        ownerName: page.ownerName ?? null,
        plannedBudget: page.plannedBudget ?? null,
        actualSpend: page.actualSpend ?? null,
        overview: page.overview ?? null,
        attributionTemplate: page.attributionTemplate ?? null,
        displayLevel: displayMap[page.displayLevel],
      };
    case "event":
      return {
        ...base,
        type: "event",
        title: page.title,
        initiativeExternalId: page.initiativeExternalId.replaceAll("-", ""),
        kind: eventKindMap[page.eventType],
        startDate: page.startDate,
        endDate: page.endDate ?? null,
        contributors: page.contributors.map((contributor) => ({
          name: contributor.name,
          notionUserId: contributor.notionUserId ?? null,
        })),
        context: page.context ?? null,
        externalObjectUrls: page.externalObjectUrls,
        displayLevel: displayMap[page.displayLevel],
      };
    case "metric_definition":
      return {
        ...base,
        type: "metric_definition",
        name: page.name,
        kind: page.metricType === "Raw source" ? "raw" : "calculated",
        connectorKey: connectorMap[page.connectorType],
        connectionName: page.connectionName,
        externalMetricKey: page.externalMetricKey,
        unit: page.unit,
        aggregation: page.aggregation,
        target: page.target ?? null,
        relatedCampaignExternalIds: page.relatedCampaignExternalIds.map(
          (id) => id.replaceAll("-", ""),
        ),
        relatedInitiativeExternalIds: page.relatedInitiativeExternalIds.map(
          (id) => id.replaceAll("-", ""),
        ),
        attributionTemplate: page.attributionTemplate ?? null,
        overrideWindowDays: page.overrideWindowDays ?? null,
        formulaKey: page.formulaKey ?? null,
      };
    case "observation":
      return {
        ...base,
        type: "observation",
        title: page.title,
        metricExternalId: page.metricExternalId.replaceAll("-", ""),
        initiativeExternalId:
          page.initiativeExternalId?.replaceAll("-", "") ?? null,
        periodStart: page.periodStart,
        periodEnd: page.periodEnd,
        value: page.value,
        unit: page.unit,
        sourceReference: page.sourceReference,
        notes: page.notes ?? null,
      };
  }
}

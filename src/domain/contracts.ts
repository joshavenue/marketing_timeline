export type WorkspaceRole = "admin" | "member";
export type PublicationStatus = "draft" | "ready" | "published";
export type DisplayLevel = "primary" | "nested" | "detail";
export type TimelineKind =
  | "campaign"
  | "initiative"
  | "activity"
  | "post"
  | "milestone"
  | "launch"
  | "outcome"
  | "other";
export type ConnectorKey = "notion" | "x_post" | "x_account" | "x_ads";
export type SourceState = "active" | "changed" | "deleted";
export type MetricKind = "raw" | "calculated";
export type Freshness = "fresh" | "stale" | "frozen";
export type RefreshStatus =
  | "draft"
  | "approved"
  | "queued"
  | "running"
  | "succeeded"
  | "partially_failed"
  | "failed"
  | "cancelled";

export interface SourceCitation {
  sourceUrl: string;
  connector: ConnectorKey;
  connectionName: string;
  observedAt: string;
  snapshotId: string;
}

export interface TimelineWindow {
  start: string;
  end: string | null;
}

export interface NormalizedMetricPoint {
  externalKey: string;
  period: TimelineWindow;
  value: number;
  unit: string;
  kind: MetricKind;
  citation: SourceCitation;
}

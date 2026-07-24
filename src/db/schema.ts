import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "admin",
  "member",
]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "ready",
  "published",
]);
export const displayLevelEnum = pgEnum("display_level", [
  "primary",
  "nested",
  "detail",
]);
export const timelineKindEnum = pgEnum("timeline_kind", [
  "campaign",
  "initiative",
  "activity",
  "post",
  "milestone",
  "launch",
  "outcome",
  "other",
]);
export const connectorKeyEnum = pgEnum("connector_key", [
  "notion",
  "x_post",
  "x_account",
  "x_ads",
]);
export const sourceStateEnum = pgEnum("source_state", [
  "active",
  "changed",
  "deleted",
]);
export const metricKindEnum = pgEnum("metric_kind", ["raw", "calculated"]);
export const freshnessEnum = pgEnum("freshness", [
  "fresh",
  "stale",
  "frozen",
]);
export const refreshStatusEnum = pgEnum("refresh_status", [
  "draft",
  "approved",
  "queued",
  "running",
  "succeeded",
  "partially_failed",
  "failed",
  "cancelled",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").default("USD").notNull(),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("invitations_workspace_email_unique").on(
      table.workspaceId,
      table.email,
    ),
    uniqueIndex("invitations_token_hash_unique").on(table.tokenHash),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("memberships_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_preferences_workspace_user_key_unique").on(
      table.workspaceId,
      table.userId,
      table.key,
    ),
  ],
);

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectorKey: connectorKeyEnum("connector_key").notNull(),
    name: text("name").notNull(),
    credentialsCiphertext: text("credentials_ciphertext"),
    configJson: jsonb("config_json").default({}).notNull(),
    costPerOperationMicros: numeric("cost_per_operation_micros", {
      precision: 20,
      scale: 0,
    })
      .default("0")
      .notNull(),
    hardCapMicros: numeric("hard_cap_micros", {
      precision: 20,
      scale: 0,
    })
      .default("0")
      .notNull(),
    periodUsageMicros: numeric("period_usage_micros", {
      precision: 20,
      scale: 0,
    })
      .default("0")
      .notNull(),
    usagePeriodStart: date("usage_period_start").notNull(),
    freezeAgeDays: integer("freeze_age_days").default(7).notNull(),
    health: text("health").default("unconfigured").notNull(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("connections_workspace_connector_name_unique").on(
      table.workspaceId,
      table.connectorKey,
      table.name,
    ),
  ],
);

export const connectorSkills = pgTable(
  "connector_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    apiFamily: text("api_family").notNull(),
    version: integer("version").notNull(),
    markdown: text("markdown").notNull(),
    checksum: text("checksum").notNull(),
    active: boolean("active").default(false).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("connector_skills_workspace_family_version_unique").on(
      table.workspaceId,
      table.apiFamily,
      table.version,
    ),
  ],
);

export const refreshJobs = pgTable("refresh_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  status: refreshStatusEnum("status").default("draft").notNull(),
  requestJson: jsonb("request_json").notNull(),
  estimatedCostMicros: numeric("estimated_cost_micros", {
    precision: 20,
    scale: 0,
  })
    .default("0")
    .notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  retryAt: timestamp("retry_at", { withTimezone: true }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sourceSnapshots = pgTable(
  "source_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    externalObjectId: text("external_object_id").notNull(),
    operationKey: text("operation_key").notNull(),
    requestScopeJson: jsonb("request_scope_json").notNull(),
    requestChecksum: text("request_checksum").notNull(),
    responseJson: jsonb("response_json").notNull(),
    responseHeadersJson: jsonb("response_headers_json").default({}).notNull(),
    checksum: text("checksum").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("source_snapshots_identity_unique").on(
      table.workspaceId,
      table.connectionId,
      table.externalObjectId,
      table.operationKey,
      table.requestChecksum,
      table.checksum,
    ),
  ],
);

export const refreshJobItems = pgTable(
  "refresh_job_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => refreshJobs.id, { onDelete: "cascade" }),
    externalObjectId: text("external_object_id").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull(),
    status: refreshStatusEnum("status").default("queued").notNull(),
    estimatedCostMicros: numeric("estimated_cost_micros", {
      precision: 20,
      scale: 0,
    })
      .default("0")
      .notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    snapshotId: uuid("snapshot_id").references(() => sourceSnapshots.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("refresh_job_items_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
    publicationStatus: publicationStatusEnum("publication_status").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    ownerName: text("owner_name"),
    objective: text("objective"),
    displayLevel: displayLevelEnum("display_level").notNull(),
    sourceUrlsJson: jsonb("source_urls_json").default([]).notNull(),
    sourceState: sourceStateEnum("source_state").default("active").notNull(),
    currentSnapshotId: uuid("current_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("campaigns_workspace_external_unique").on(
      table.workspaceId,
      table.externalId,
    ),
  ],
);

export const campaignVersions = pgTable(
  "campaign_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    recordJson: jsonb("record_json").notNull(),
    sourceSnapshotId: uuid("source_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("campaign_versions_campaign_version_unique").on(
      table.workspaceId,
      table.campaignId,
      table.version,
    ),
  ],
);

export const initiatives = pgTable(
  "initiatives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
    publicationStatus: publicationStatusEnum("publication_status").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    ownerName: text("owner_name"),
    plannedBudget: numeric("planned_budget", { precision: 20, scale: 6 }),
    actualSpend: numeric("actual_spend", { precision: 20, scale: 6 }),
    overview: text("overview"),
    attributionTemplate: text("attribution_template"),
    displayLevel: displayLevelEnum("display_level").notNull(),
    sourceUrlsJson: jsonb("source_urls_json").default([]).notNull(),
    sourceState: sourceStateEnum("source_state").default("active").notNull(),
    currentSnapshotId: uuid("current_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("initiatives_workspace_external_unique").on(
      table.workspaceId,
      table.externalId,
    ),
  ],
);

export const initiativeVersions = pgTable(
  "initiative_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    recordJson: jsonb("record_json").notNull(),
    sourceSnapshotId: uuid("source_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("initiative_versions_initiative_version_unique").on(
      table.workspaceId,
      table.initiativeId,
      table.version,
    ),
  ],
);

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    initiativeId: uuid("initiative_id").references(() => initiatives.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    kind: timelineKindEnum("kind").notNull(),
    publicationStatus: publicationStatusEnum("publication_status").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    context: text("context"),
    externalUrlsJson: jsonb("external_urls_json").default([]).notNull(),
    sourceUrlsJson: jsonb("source_urls_json").default([]).notNull(),
    displayLevel: displayLevelEnum("display_level").notNull(),
    sourceState: sourceStateEnum("source_state").default("active").notNull(),
    currentSnapshotId: uuid("current_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("timeline_events_workspace_external_unique").on(
      table.workspaceId,
      table.externalId,
    ),
  ],
);

export const timelineEventVersions = pgTable(
  "timeline_event_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => timelineEvents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    recordJson: jsonb("record_json").notNull(),
    sourceSnapshotId: uuid("source_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("timeline_event_versions_event_version_unique").on(
      table.workspaceId,
      table.eventId,
      table.version,
    ),
  ],
);

export const timelineEventContributors = pgTable(
  "timeline_event_contributors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => timelineEvents.id, { onDelete: "cascade" }),
    contributorName: text("contributor_name").notNull(),
    notionUserId: text("notion_user_id"),
  },
  (table) => [
    uniqueIndex("timeline_event_contributors_identity_unique").on(
      table.workspaceId,
      table.eventId,
      table.contributorName,
    ),
  ],
);

export const metricDefinitions = pgTable(
  "metric_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    kind: metricKindEnum("kind").notNull(),
    connectorKey: connectorKeyEnum("connector_key").notNull(),
    connectionName: text("connection_name").notNull(),
    externalMetricKey: text("external_metric_key").notNull(),
    unit: text("unit").notNull(),
    aggregation: text("aggregation").notNull(),
    target: numeric("target", { precision: 30, scale: 10 }),
    attributionTemplate: text("attribution_template"),
    overrideWindowDays: integer("override_window_days"),
    formulaKey: text("formula_key"),
    publicationStatus: publicationStatusEnum("publication_status").notNull(),
    sourceState: sourceStateEnum("source_state").default("active").notNull(),
    currentSnapshotId: uuid("current_snapshot_id").references(
      () => sourceSnapshots.id,
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("metric_definitions_workspace_external_unique").on(
      table.workspaceId,
      table.externalId,
    ),
  ],
);

export const metricObservations = pgTable(
  "metric_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id").references(() => initiatives.id, {
      onDelete: "set null",
    }),
    sourceSnapshotId: uuid("source_snapshot_id")
      .notNull()
      .references(() => sourceSnapshots.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    value: numeric("value", { precision: 30, scale: 10 }).notNull(),
    unit: text("unit").notNull(),
    freshness: freshnessEnum("freshness").notNull(),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    sourceUrl: text("source_url").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("metric_observations_identity_unique").on(
      table.workspaceId,
      table.metricDefinitionId,
      table.periodStart,
      table.periodEnd,
      table.sourceSnapshotId,
    ),
  ],
);

export const initiativeMetrics = pgTable(
  "initiative_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("initiative_metrics_identity_unique").on(
      table.workspaceId,
      table.initiativeId,
      table.metricDefinitionId,
    ),
  ],
);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  parentCommentId: uuid("parent_comment_id").references(
    (): AnyPgColumn => comments.id,
    { onDelete: "cascade" },
  ),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  ...timestamps,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  commentId: uuid("comment_id").references(() => comments.id, {
    onDelete: "cascade",
  }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  detailsJson: jsonb("details_json").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

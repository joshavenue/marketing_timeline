CREATE TYPE "connector_key" AS ENUM('notion', 'x_post', 'x_account', 'x_ads');--> statement-breakpoint
CREATE TYPE "display_level" AS ENUM('primary', 'nested', 'detail');--> statement-breakpoint
CREATE TYPE "freshness" AS ENUM('fresh', 'stale', 'frozen');--> statement-breakpoint
CREATE TYPE "metric_kind" AS ENUM('raw', 'calculated');--> statement-breakpoint
CREATE TYPE "publication_status" AS ENUM('draft', 'ready', 'published');--> statement-breakpoint
CREATE TYPE "refresh_status" AS ENUM('draft', 'approved', 'queued', 'running', 'succeeded', 'partially_failed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "source_state" AS ENUM('active', 'changed', 'deleted');--> statement-breakpoint
CREATE TYPE "timeline_kind" AS ENUM('campaign', 'initiative', 'activity', 'post', 'milestone', 'launch', 'outcome', 'other');--> statement-breakpoint
CREATE TYPE "workspace_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"details_json" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"record_json" jsonb NOT NULL,
	"source_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"lifecycle_status" text NOT NULL,
	"publication_status" "publication_status" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"owner_name" text,
	"objective" text,
	"display_level" "display_level" NOT NULL,
	"source_urls_json" jsonb DEFAULT '[]' NOT NULL,
	"source_state" "source_state" DEFAULT 'active'::"source_state" NOT NULL,
	"current_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"connector_key" "connector_key" NOT NULL,
	"name" text NOT NULL,
	"credentials_ciphertext" text,
	"config_json" jsonb DEFAULT '{}' NOT NULL,
	"cost_per_operation_micros" numeric(20,0) DEFAULT '0' NOT NULL,
	"hard_cap_micros" numeric(20,0) DEFAULT '0' NOT NULL,
	"period_usage_micros" numeric(20,0) DEFAULT '0' NOT NULL,
	"usage_period_start" date NOT NULL,
	"freeze_age_days" integer DEFAULT 7 NOT NULL,
	"health" text DEFAULT 'unconfigured' NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"api_family" text NOT NULL,
	"version" integer NOT NULL,
	"markdown" text NOT NULL,
	"checksum" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"initiative_id" uuid NOT NULL,
	"metric_definition_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"initiative_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"record_json" jsonb NOT NULL,
	"source_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"campaign_id" uuid,
	"name" text NOT NULL,
	"lifecycle_status" text NOT NULL,
	"publication_status" "publication_status" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"owner_name" text,
	"planned_budget" numeric(20,6),
	"actual_spend" numeric(20,6),
	"overview" text,
	"attribution_template" text,
	"display_level" "display_level" NOT NULL,
	"source_urls_json" jsonb DEFAULT '[]' NOT NULL,
	"source_state" "source_state" DEFAULT 'active'::"source_state" NOT NULL,
	"current_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "metric_kind" NOT NULL,
	"connector_key" "connector_key" NOT NULL,
	"connection_name" text NOT NULL,
	"external_metric_key" text NOT NULL,
	"unit" text NOT NULL,
	"aggregation" text NOT NULL,
	"target" numeric(30,10),
	"attribution_template" text,
	"override_window_days" integer,
	"formula_key" text,
	"publication_status" "publication_status" NOT NULL,
	"source_state" "source_state" DEFAULT 'active'::"source_state" NOT NULL,
	"current_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"metric_definition_id" uuid NOT NULL,
	"initiative_id" uuid,
	"source_snapshot_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"value" numeric(30,10) NOT NULL,
	"unit" text NOT NULL,
	"freshness" "freshness" NOT NULL,
	"frozen_at" timestamp with time zone,
	"source_url" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"comment_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"external_object_id" text NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"status" "refresh_status" DEFAULT 'queued'::"refresh_status" NOT NULL,
	"estimated_cost_micros" numeric(20,0) DEFAULT '0' NOT NULL,
	"error_code" text,
	"error_message" text,
	"snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "refresh_status" DEFAULT 'draft'::"refresh_status" NOT NULL,
	"request_json" jsonb NOT NULL,
	"estimated_cost_micros" numeric(20,0) DEFAULT '0' NOT NULL,
	"approved_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"retry_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_object_id" text NOT NULL,
	"operation_key" text NOT NULL,
	"request_scope_json" jsonb NOT NULL,
	"request_checksum" text NOT NULL,
	"response_json" jsonb NOT NULL,
	"response_headers_json" jsonb DEFAULT '{}' NOT NULL,
	"checksum" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_event_contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"contributor_name" text NOT NULL,
	"notion_user_id" text
);
--> statement-breakpoint
CREATE TABLE "timeline_event_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"record_json" jsonb NOT NULL,
	"source_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"initiative_id" uuid,
	"title" text NOT NULL,
	"kind" "timeline_kind" NOT NULL,
	"publication_status" "publication_status" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"context" text,
	"external_urls_json" jsonb DEFAULT '[]' NOT NULL,
	"source_urls_json" jsonb DEFAULT '[]' NOT NULL,
	"display_level" "display_level" NOT NULL,
	"source_state" "source_state" DEFAULT 'active'::"source_state" NOT NULL,
	"current_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL,
	"name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_versions_campaign_version_unique" ON "campaign_versions" ("workspace_id","campaign_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_workspace_external_unique" ON "campaigns" ("workspace_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_workspace_connector_name_unique" ON "connections" ("workspace_id","connector_key","name");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_skills_workspace_family_version_unique" ON "connector_skills" ("workspace_id","api_family","version");--> statement-breakpoint
CREATE UNIQUE INDEX "initiative_metrics_identity_unique" ON "initiative_metrics" ("workspace_id","initiative_id","metric_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "initiative_versions_initiative_version_unique" ON "initiative_versions" ("workspace_id","initiative_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "initiatives_workspace_external_unique" ON "initiatives" ("workspace_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_workspace_email_unique" ON "invitations" ("workspace_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_unique" ON "invitations" ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_workspace_user_unique" ON "memberships" ("workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_definitions_workspace_external_unique" ON "metric_definitions" ("workspace_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_observations_identity_unique" ON "metric_observations" ("workspace_id","metric_definition_id","period_start","period_end","source_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_job_items_workspace_idempotency_unique" ON "refresh_job_items" ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "source_snapshots_identity_unique" ON "source_snapshots" ("workspace_id","connection_id","external_object_id","operation_key","request_checksum","checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_event_contributors_identity_unique" ON "timeline_event_contributors" ("workspace_id","event_id","contributor_name");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_event_versions_event_version_unique" ON "timeline_event_versions" ("workspace_id","event_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_events_workspace_external_unique" ON "timeline_events" ("workspace_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_workspace_user_key_unique" ON "user_preferences" ("workspace_id","user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_campaign_id_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_source_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("source_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_current_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("current_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_users_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "connector_skills" ADD CONSTRAINT "connector_skills_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "connector_skills" ADD CONSTRAINT "connector_skills_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "initiative_metrics" ADD CONSTRAINT "initiative_metrics_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiative_metrics" ADD CONSTRAINT "initiative_metrics_initiative_id_initiatives_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "initiatives"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiative_metrics" ADD CONSTRAINT "initiative_metrics_6RJDvyTDUMPt_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiative_versions" ADD CONSTRAINT "initiative_versions_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiative_versions" ADD CONSTRAINT "initiative_versions_initiative_id_initiatives_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "initiatives"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiative_versions" ADD CONSTRAINT "initiative_versions_source_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("source_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_campaign_id_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_current_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("current_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_current_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("current_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_QjAGwLtfCH6p_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_initiative_id_initiatives_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "initiatives"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_source_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("source_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_job_items" ADD CONSTRAINT "refresh_job_items_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_job_items" ADD CONSTRAINT "refresh_job_items_job_id_refresh_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "refresh_jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_job_items" ADD CONSTRAINT "refresh_job_items_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "refresh_jobs" ADD CONSTRAINT "refresh_jobs_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_jobs" ADD CONSTRAINT "refresh_jobs_connection_id_connections_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_jobs" ADD CONSTRAINT "refresh_jobs_requested_by_users_id_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_connection_id_connections_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_event_contributors" ADD CONSTRAINT "timeline_event_contributors_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_event_contributors" ADD CONSTRAINT "timeline_event_contributors_event_id_timeline_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "timeline_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_event_versions" ADD CONSTRAINT "timeline_event_versions_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_event_versions" ADD CONSTRAINT "timeline_event_versions_event_id_timeline_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "timeline_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_event_versions" ADD CONSTRAINT "timeline_event_versions_8m1Q5TGnmSpt_fkey" FOREIGN KEY ("source_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_initiative_id_initiatives_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "initiatives"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_current_snapshot_id_source_snapshots_id_fkey" FOREIGN KEY ("current_snapshot_id") REFERENCES "source_snapshots"("id");--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
import { Pool } from "pg";

export const TEST_DATABASE_URL =
  "postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test";

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

const productTables = [
  "audit_events",
  "notifications",
  "comments",
  "initiative_metrics",
  "metric_observations",
  "metric_definitions",
  "timeline_event_contributors",
  "timeline_event_versions",
  "timeline_events",
  "initiative_versions",
  "initiatives",
  "campaign_versions",
  "campaigns",
  "source_snapshots",
  "refresh_job_items",
  "refresh_jobs",
  "connector_skills",
  "connections",
  "user_preferences",
  "memberships",
  "invitations",
  "users",
  "workspaces",
];

export async function resetDatabase() {
  await pool.query(
    `TRUNCATE TABLE ${productTables.map((table) => `"${table}"`).join(", ")} CASCADE`,
  );
}

export async function closeDatabasePool() {
  await pool.end();
}

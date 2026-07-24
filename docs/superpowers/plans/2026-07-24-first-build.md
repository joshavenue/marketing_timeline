# Marketing Timeline Dashboard First Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the first usable Marketing Timeline Dashboard on the current VPS with invited Google sign-in, curated Notion synchronization, the horizontal history timeline, initiative details, native comments, manual/cost-controlled refresh infrastructure, and separately presented X post, account, and ads analytics.

**Architecture:** Build one TypeScript modular monolith using Next.js App Router, a worker process from the same repository, and PostgreSQL. Treat Notion and X as read-only sources; persist immutable source snapshots before normalization; keep every query workspace-scoped; and allow external calls only through admin-confirmed refresh jobs.

**Tech Stack:** Node.js 24, pnpm 11, Next.js App Router, React, TypeScript, Tailwind CSS, Auth.js/NextAuth with Google OAuth, PostgreSQL 18, Drizzle ORM, Zod, Vitest, Testing Library, Playwright, Caddy, Docker Engine and Docker Compose.

**Detected VPS baseline on 2026-07-24:** Node.js `v24.18.0`, pnpm `11.16.0`, PostgreSQL client `18.4`, and Caddy `v2.11.4` are installed. Docker Engine and Docker Compose were not detected and must be installed before PostgreSQL-backed integration tests.

## Global Constraints

- Read and obey `docs/superpowers/specs/2026-07-24-marketing-timeline-dashboard-design.md` before changing code.
- Work only in `/root/marketing-timeline-dashboard`.
- Preserve the approved hierarchy: Campaign → Initiative → Timeline Event/Contribution.
- Notion owns editable marketing records; X owns imported analytics; the application never writes to either.
- Only Notion records whose `Publication Status` is `Published` may enter product queries.
- Notion lifecycle status is displayed verbatim and is separate from publication status.
- Native writes are limited to invitations, configuration, comments, notifications, user preferences, refresh jobs, snapshots, derived records, and audit events.
- Roles are exactly `admin` and `member`; permissions are workspace-wide.
- External API refresh is manual and admin-only.
- Every refresh needs a preflight showing scope, eligible/frozen/invalid objects, operation count, estimated cost, usage, and remaining hard cap.
- Frozen metric observations cannot be re-read. Notion is exempt from the metric freeze.
- Default source-object freeze age is seven days, but the stored connector policy is configurable.
- X post, X account, and X Ads are separate connector contexts and separate UI views.
- Store unsupported X capabilities as explicit capability errors; never synthesize missing metrics.
- API skill documents are one versioned instructional Markdown file per API family and never execute code.
- Cached browsing and assistant-free V1 pages issue zero external API calls.
- Use one workspace base currency.
- Retain imported source snapshots and normalized versions indefinitely unless the workspace is deleted.
- Use Google OAuth restricted to pending or active invited emails.
- Comments support replies and `@mentions`; notifications are in-app only.
- No scheduled polling, native marketing-record editor, saved AI chat, PDF/CSV export, GA4, Helius, direct Metabase, xAI sentiment, or OpenRouter assistant in this first-build plan.
- `google/gemma-4-31b-it` remains documented for the later OpenRouter phase; do not add OpenRouter to this build.
- TDD is mandatory: add a failing test, observe the intended failure, implement minimally, and rerun relevant plus full checks.
- Commit after every task. Do not combine tasks into one commit.
- Delivery is autonomous within this repository: create the implementation branch, commit, push, open and update the pull request, resolve review or CI issues, merge after every required check passes, and deploy the merged `main` branch without pausing for routine approval.
- Never force-push, bypass a required check, weaken a test to obtain a pass, merge with unresolved failures, or make destructive changes outside this repository.
- Never commit `.env`, credentials, OAuth tokens, X tokens, Notion tokens, SMTP passwords, backup keys, or production source snapshots.

## First-build definition of done

The build is complete only when:

1. An invited Google account can sign in and an uninvited account is rejected.
2. A valid published Notion record appears on the correct date; draft and invalid records do not.
3. A changed Notion record creates a new version and a deleted source is archived instead of removed.
4. The horizontal timeline supports past → present → future scrolling, remembered position, four zoom presets, and the five approved filters.
5. A marker opens a drawer and its full page without losing timeline position.
6. Budgets, contribution rows, metrics, formulas, source citations, freshness, and version history render from cached data.
7. Members can comment, reply, mention users, and receive in-app notifications.
8. X post, account, and ads contexts import only real supported values and remain visually separate.
9. Admin refresh preflight enforces caps and freeze rules before enqueueing a job.
10. Cached browsing makes no external calls.
11. Unit, integration, and Playwright acceptance tests pass.
12. The application is served through HTTPS on the VPS and an encrypted off-VPS backup can be restored.

## Locked domain contracts

Create these exact shared contracts in Task 1 and do not rename them later:

```ts
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
```

## File map

Files are grouped by responsibility. Keep these boundaries during implementation.

```text
src/
  app/
    api/auth/[...nextauth]/route.ts      Auth.js route
    api/health/route.ts                  Liveness/readiness response
    api/jobs/[jobId]/route.ts            Refresh progress polling
    invite/[token]/page.tsx              Invitation acceptance
    login/page.tsx                       Google sign-in
    (dashboard)/
      layout.tsx                         Authenticated shell
      timeline/page.tsx                  Timeline server page
      initiatives/[initiativeId]/page.tsx
      settings/connections/page.tsx
      settings/notion/page.tsx
      settings/users/page.tsx
      settings/audit/page.tsx
  auth.ts                                Auth.js configuration
  proxy.ts                               Protected-route proxy
  components/
    timeline/HistoryTimeline.tsx
    timeline/TimelineEvent.tsx
    timeline/GrowthRail.tsx
    initiatives/InitiativeDrawer.tsx
    initiatives/InitiativeDetail.tsx
    comments/CommentThread.tsx
    settings/RefreshPreflight.tsx
  domain/contracts.ts                    Locked shared types
  db/client.ts                           PostgreSQL/Drizzle client
  db/schema.ts                           Complete relational schema
  db/queries/                            Workspace-scoped query functions
  lib/env.ts                             Validated server environment
  lib/auth/access.ts                     Role and workspace authorization
  lib/audit/service.ts                   Append-only audit writes
  lib/crypto/secrets.ts                  AES-GCM credential encryption
  lib/notion/
    client.ts                            Read-only Notion client
    canonical.ts                         Canonical Notion DTOs
    validate.ts                          Zod validation
    sync.ts                              Published record/version import
  lib/connectors/
    types.ts                             Connector interface
    registry.ts                          Connector registration
    skills.ts                            API skill storage/version checks
    x/client.ts                          Allowlisted X HTTP client
    x/post.ts                            Per-post adapter
    x/account.ts                         Account adapter
    x/ads.ts                             Ads analytics adapter
  lib/refresh/
    preflight.ts                         Cost/cap/freeze decision
    jobs.ts                              Job persistence and claiming
    worker.ts                            Job executor
  lib/metrics/
    calculate.ts                         Allowlisted formulas
    freshness.ts                         Fresh/stale/frozen derivation
  lib/timeline/query.ts                  Windowed timeline read model
  lib/comments/service.ts                Comments/replies/mentions
  lib/notifications/service.ts           In-app notifications
scripts/
  worker.ts                              Worker entrypoint
  backup.sh                              Encrypted off-VPS backup
  restore.sh                             Isolated restore
tests/
  unit/                                  Pure logic tests
  integration/                           PostgreSQL-backed tests
  e2e/                                   Playwright acceptance tests
fixtures/
  notion/                                Sanitized Notion responses
  x/                                     Sanitized X responses
docker-compose.yml
Dockerfile
Caddyfile
.env.example
```

## Spec-to-task coverage

| Approved requirement | Owning task |
|---|---|
| VPS test environment | Task 0 |
| Shared contracts and build baseline | Task 1 |
| Workspace isolation and durable schema | Task 2 |
| Invitations, Google OAuth, Admin/Member | Task 3 |
| Credential encryption, audit, API skills | Task 4 |
| Canonical Notion validation, import, versions, deletion archive | Task 5 |
| Historical timeline, zoom, filters, remembered viewport, growth rail shell | Task 6 |
| Drawer/full page, budgets, contributions, raw/calculated metrics, citations | Task 7 |
| Comments, replies, mentions, in-app notifications | Task 8 |
| Manual preflight, caps, freeze, idempotent worker | Task 9 |
| X post, account, and ads contexts | Task 10 |
| Admin connections, users, skills, caps, and audit UI | Task 11 |
| Docker production deployment, HTTPS, encrypted off-VPS backup and restore | Task 12 |
| Full acceptance matrix and real-source deployment | Task 13 |

---

### Task 0: Prepare the Docker-backed test database

**Files:**
- Create: `docker-compose.test.yml`
- Create: `docs/runbooks/developer-setup.md`

**Interfaces:**
- Produces: PostgreSQL 18 test database at `postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test`.

- [x] **Step 1: Install Docker Engine and Compose from the official Ubuntu repository**

Run:

```bash
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
printf '%s\n' \
  'Types: deb' \
  'URIs: https://download.docker.com/linux/ubuntu' \
  "Suites: $(. /etc/os-release && echo \"${UBUNTU_CODENAME:-$VERSION_CODENAME}\")" \
  'Components: stable' \
  "Architectures: $(dpkg --print-architecture)" \
  'Signed-By: /etc/apt/keyrings/docker.asc' \
  > /etc/apt/sources.list.d/docker.sources
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker --version
docker compose version
docker run --rm hello-world
```

Expected: Docker, Compose, and `hello-world` succeed.

- [x] **Step 2: Create the isolated test database**

`docker-compose.test.yml`:

```yaml
services:
  postgres-test:
    image: postgres:18
    environment:
      POSTGRES_DB: marketing_test
      POSTGRES_USER: marketing_test
      POSTGRES_PASSWORD: marketing_test
    ports:
      - "127.0.0.1:55432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U marketing_test -d marketing_test"]
      interval: 2s
      timeout: 2s
      retries: 20
    tmpfs:
      - /var/lib/postgresql/data
```

Document start, stop, and connection commands in `docs/runbooks/developer-setup.md`.

- [x] **Step 3: Verify and commit**

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml exec postgres-test pg_isready -U marketing_test -d marketing_test
git add docker-compose.test.yml docs/runbooks/developer-setup.md
git commit -m "chore: add isolated test database"
```

Expected: `pg_isready` reports “accepting connections”.

---

### Task 1: Bootstrap the application and lock shared contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/api/health/route.ts`
- Create: `src/app/globals.css`
- Create: `src/domain/contracts.ts`
- Create: `src/lib/env.ts`
- Create: `.env.example`
- Create: `tests/unit/env.test.ts`

**Interfaces:**
- Produces: every type in “Locked domain contracts”.
- Produces: `readServerEnv(input?: NodeJS.ProcessEnv): ServerEnv`.
- Produces: `GET /api/health` returning `{ status: "ok" }`.

- [x] **Step 1: Add package metadata and dependencies**

Create scripts with these exact names:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "worker": "tsx scripts/worker.ts"
  }
}
```

Install and commit the resolved lockfile:

```bash
pnpm add next@latest react@latest react-dom@latest next-auth zod drizzle-orm@rc pg nodemailer date-fns nanoid clsx tailwind-merge @notionhq/client
pnpm add -D typescript @types/node @types/react @types/react-dom @types/pg @types/nodemailer drizzle-kit@rc tsx vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom @playwright/test eslint eslint-config-next tailwindcss @tailwindcss/postcss
```

- [x] **Step 2: Write the failing environment test**

```ts
import { describe, expect, it } from "vitest";
import { readServerEnv } from "@/lib/env";

describe("readServerEnv", () => {
  it("rejects a missing database URL", () => {
    expect(() => readServerEnv({ AUTH_SECRET: "x".repeat(32) })).toThrow(
      "DATABASE_URL",
    );
  });

  it("accepts the minimum build-time environment", () => {
    const env = readServerEnv({
      DATABASE_URL: "postgres://app:app@localhost:5432/marketing",
      AUTH_SECRET: "x".repeat(32),
      APP_ORIGIN: "http://localhost:3000",
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
    });
    expect(env.APP_ORIGIN).toBe("http://localhost:3000");
  });
});
```

- [x] **Step 3: Verify the test fails**

Run: `pnpm test tests/unit/env.test.ts`

Expected: FAIL because `@/lib/env` does not exist.

- [x] **Step 4: Implement the environment parser, contracts, root page, and health route**

`ServerEnv` must require `DATABASE_URL`, a 32-character-or-longer `AUTH_SECRET`, an absolute `APP_ORIGIN`, and a base64-encoded 32-byte `CREDENTIAL_ENCRYPTION_KEY`. OAuth, SMTP, Notion, X, backup, and production-domain variables remain optional at parse time and are validated when their corresponding feature is enabled. `APP_ENV` is exactly `development`, `test`, or `production`. `E2E_TEST_MODE=1` is accepted only when `APP_ENV=test` and `APP_ORIGIN` uses `localhost`; reject every other combination.

The committed `.gitignore` must include:

```text
.env
.env.*
!.env.example
.next/
node_modules/
playwright-report/
test-results/
coverage/
backups/
fixtures/private/
```

Configure Playwright for Chromium with:

```ts
webServer: {
  command:
    "APP_ENV=test E2E_TEST_MODE=1 E2E_TEST_ADMIN_EMAIL=admin@example.test E2E_TEST_MEMBER_EMAIL=member@example.test pnpm dev",
  url: "http://127.0.0.1:3000",
  reuseExistingServer: false,
},
use: { baseURL: "http://127.0.0.1:3000" },
```

Create an ignored `.env.local` during execution with these non-production values:

```dotenv
APP_ENV=development
DATABASE_URL=postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test
AUTH_SECRET=0123456789abcdef0123456789abcdef
APP_ORIGIN=http://127.0.0.1:3000
CREDENTIAL_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

Use the exact locked domain contracts above. The root page redirects authenticated users later; for this task it renders “Marketing Timeline Dashboard”. The health route returns status 200 and `{ "status": "ok" }`.

- [x] **Step 5: Run the foundation checks**

Run:

```bash
pnpm test tests/unit/env.test.ts
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts .gitignore .env.example src tests/unit/env.test.ts
git commit -m "chore: bootstrap timeline dashboard"
```

---

### Task 2: Create the workspace-scoped database and migrations

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/queries/workspaces.ts`
- Create: `src/db/queries/timeline.ts`
- Create: `tests/integration/db-schema.test.ts`
- Create: `tests/helpers/database.ts`
- Generate: `drizzle/*`

**Interfaces:**
- Produces: `db` Drizzle client.
- Produces: `createWorkspace(name: string): Promise<{ id: string; name: string }>`
- Produces: `listTimelineRows(workspaceId: string, window: TimelineWindow): Promise<TimelineRow[]>`
- Rule: every product table except `users` includes `workspaceId`.
- Test database URL: `postgresql://marketing_test:marketing_test@127.0.0.1:55432/marketing_test`.

Required tables:

```text
workspaces
users
invitations
memberships
user_preferences
connections
connector_skills
refresh_jobs
refresh_job_items
source_snapshots
campaigns
campaign_versions
initiatives
initiative_versions
timeline_events
timeline_event_versions
timeline_event_contributors
metric_definitions
metric_observations
initiative_metrics
comments
notifications
audit_events
```

Required column contract:

```text
workspaces: id, name, base_currency, created_at, updated_at
users: id, email, name, image_url, created_at, updated_at
invitations: id, workspace_id, email, role, token_hash, expires_at, accepted_at, invited_by, created_at
memberships: id, workspace_id, user_id, role, active, created_at, updated_at
user_preferences: id, workspace_id, user_id, key, value_json, updated_at
connections: id, workspace_id, connector_key, name, credentials_ciphertext, config_json,
  cost_per_operation_micros, hard_cap_micros, period_usage_micros, usage_period_start,
  freeze_age_days, health, last_success_at, last_error_code, last_error_message, created_at, updated_at
connector_skills: id, workspace_id, api_family, version, markdown, checksum, active, created_by, created_at
refresh_jobs: id, workspace_id, connection_id, requested_by, status, request_json,
  estimated_cost_micros, approved_at, started_at, finished_at, retry_at, error_code, error_message, created_at
refresh_job_items: id, workspace_id, job_id, external_object_id, period_start, period_end,
  idempotency_key, status, estimated_cost_micros, error_code, error_message, snapshot_id, created_at, updated_at
source_snapshots: id, workspace_id, connection_id, external_object_id, operation_key,
  request_scope_json, request_checksum, response_json, response_headers_json, checksum, observed_at, created_at
campaigns: id, workspace_id, external_id, name, lifecycle_status, publication_status,
  start_date, end_date, owner_name, objective, display_level, source_urls_json, source_state,
  current_snapshot_id, created_at, updated_at
campaign_versions: id, workspace_id, campaign_id, version, record_json, source_snapshot_id, created_at
initiatives: id, workspace_id, external_id, campaign_id, name, lifecycle_status, publication_status,
  start_date, end_date, owner_name, planned_budget, actual_spend, overview, attribution_template,
  display_level, source_urls_json, source_state, current_snapshot_id, created_at, updated_at
initiative_versions: id, workspace_id, initiative_id, version, record_json, source_snapshot_id, created_at
timeline_events: id, workspace_id, external_id, initiative_id, title, kind, publication_status,
  start_date, end_date, context, external_urls_json, source_urls_json, display_level,
  source_state, current_snapshot_id, created_at, updated_at
timeline_event_versions: id, workspace_id, event_id, version, record_json, source_snapshot_id, created_at
timeline_event_contributors: id, workspace_id, event_id, contributor_name, notion_user_id
metric_definitions: id, workspace_id, external_id, name, kind, connector_key, connection_name,
  external_metric_key, unit, aggregation, target, attribution_template, override_window_days,
  formula_key, publication_status, source_state, current_snapshot_id, created_at, updated_at
metric_observations: id, workspace_id, metric_definition_id, initiative_id, source_snapshot_id,
  period_start, period_end, value, unit, freshness, frozen_at, source_url, observed_at, created_at
initiative_metrics: id, workspace_id, initiative_id, metric_definition_id
comments: id, workspace_id, entity_type, entity_id, parent_comment_id, author_user_id, body, created_at, updated_at
notifications: id, workspace_id, user_id, type, entity_type, entity_id, comment_id, read_at, created_at
audit_events: id, workspace_id, actor_user_id, action, entity_type, entity_id, details_json, created_at
```

Use UUID primary keys, `timestamp with time zone`, foreign keys, and these non-negotiable unique constraints:

```text
memberships(workspace_id, user_id)
invitations(workspace_id, email)
connections(workspace_id, connector_key, name)
connector_skills(workspace_id, api_family, version)
source_snapshots(workspace_id, connection_id, external_object_id, operation_key, request_checksum, checksum)
campaigns(workspace_id, external_id)
initiatives(workspace_id, external_id)
timeline_events(workspace_id, external_id)
metric_definitions(workspace_id, external_id)
refresh_job_items(workspace_id, idempotency_key)
metric_observations(workspace_id, metric_definition_id, period_start, period_end, source_snapshot_id)
```

- [x] **Step 1: Write the failing workspace-isolation test**

Create two workspaces, one initiative in each, and assert `listTimelineRows(workspaceA.id, ...)` returns only workspace A. Also assert insertion of a duplicate `(workspace_id, external_id)` fails.

- [x] **Step 2: Verify the test fails**

Run: `pnpm test tests/integration/db-schema.test.ts`

Expected: FAIL because the schema and database helper do not exist.

- [x] **Step 3: Implement the schema and queries**

Use PostgreSQL enums matching the locked string unions. Monetary columns use `numeric(20, 6)`. Metric values use `numeric(30, 10)`. Raw JSON responses use `jsonb`. Store credential ciphertext as text and never return it from general connection queries.

Every query function accepts `workspaceId` as its first argument. Do not create a query that infers workspace from a record ID alone.

- [x] **Step 4: Generate and apply migrations**

Run:

```bash
pnpm db:generate
pnpm db:migrate
pnpm test tests/integration/db-schema.test.ts
```

Expected: migration succeeds; integration test passes.

- [x] **Step 5: Commit**

```bash
git add drizzle.config.ts drizzle src/db tests/helpers tests/integration/db-schema.test.ts
git commit -m "feat: add workspace-scoped data model"
```

---

### Task 3: Implement invitation-restricted Google authentication

**Files:**
- Create: `src/auth.ts`
- Create: `src/proxy.ts`
- Create: `src/lib/auth/access.ts`
- Create: `src/lib/auth/invitations.ts`
- Create: `src/lib/mail/send-invitation.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/invite/[token]/page.tsx`
- Create: `tests/unit/access.test.ts`
- Create: `tests/integration/invitations.test.ts`
- Create: `tests/e2e/global.setup.ts`

**Interfaces:**
- Produces: `requireWorkspaceMember(workspaceId: string): Promise<MemberContext>`
- Produces: `requireWorkspaceAdmin(workspaceId: string): Promise<MemberContext>`
- Produces: `createInvitation(input: { workspaceId: string; email: string; role: WorkspaceRole; invitedBy: string }): Promise<{ token: string }>`
- Produces: `acceptInvitation(token: string, googleEmail: string): Promise<void>`

- [ ] **Step 1: Write failing authorization tests**

Cover:

```ts
expect(canAdmin("admin")).toBe(true);
expect(canAdmin("member")).toBe(false);
await expect(acceptInvitation(validToken, "other@example.com")).rejects.toThrow(
  "Invitation email does not match",
);
```

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/access.test.ts tests/integration/invitations.test.ts`

Expected: FAIL because the access and invitation services do not exist.

- [ ] **Step 3: Implement Auth.js and invitation flow**

Configure the Google provider from `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. In the Auth.js `signIn` callback:

1. Normalize the Google email to lowercase.
2. Reject a missing or unverified email.
3. Allow an existing active membership.
4. Otherwise require an unexpired pending invitation for that email.
5. Never create a membership for an arbitrary Google user.

Invitation tokens are random 32-byte values; store only a SHA-256 token hash. Expire them after seven days. SMTP failure leaves the database invitation pending and returns a resendable result.

For Playwright only, conditionally register an Auth.js Credentials provider when `APP_ENV=test` and `E2E_TEST_MODE=1`. It may sign in only pre-seeded `E2E_TEST_ADMIN_EMAIL` and `E2E_TEST_MEMBER_EMAIL`. `global.setup.ts` seeds those users and memberships and stores browser authentication states. Production startup must fail if `E2E_TEST_MODE=1`.

- [ ] **Step 4: Run auth checks**

Run:

```bash
pnpm test tests/unit/access.test.ts tests/integration/invitations.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/proxy.ts src/lib/auth src/lib/mail src/app/api/auth src/app/login src/app/invite tests/unit/access.test.ts tests/integration/invitations.test.ts tests/e2e/global.setup.ts
git commit -m "feat: add invitation-only Google authentication"
```

---

### Task 4: Add encrypted credentials, append-only audit, and API skill versions

**Files:**
- Create: `src/lib/crypto/secrets.ts`
- Create: `src/lib/audit/service.ts`
- Create: `src/lib/connectors/skills.ts`
- Create: `docs/examples/X_API.example.md`
- Create: `tests/unit/secrets.test.ts`
- Create: `tests/integration/audit-skills.test.ts`

**Interfaces:**
- Produces: `encryptSecret(plaintext: string): string`
- Produces: `decryptSecret(payload: string): string`
- Produces: `appendAudit(event: AuditInput): Promise<void>`
- Produces: `activateSkillVersion(input: ActivateSkillInput): Promise<void>`
- Produces: `parseConnectorManifest(markdown: string): ConnectorManifest`
- Stored encryption format: `v1.<base64-iv>.<base64-ciphertext>.<base64-tag>`

```ts
export interface ConnectorManifest {
  apiFamily: string;
  version: number;
  operations: Array<{
    key: string;
    method: "GET";
    host: string;
    path: string;
    allowedQueryParameters: string[];
    allowedResponseFields: string[];
  }>;
}
```

- [ ] **Step 1: Write failing encryption and skill-version tests**

Assert encryption is nondeterministic, round-trips correctly, rejects tampering, and never includes plaintext. Assert activating skill version 2 deactivates version 1 but retains its row and emits one audit event. Assert a skill with zero or two `connector-manifest` blocks is rejected.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/secrets.test.ts tests/integration/audit-skills.test.ts`

Expected: FAIL because the services do not exist.

- [ ] **Step 3: Implement AES-256-GCM and append-only audit**

Decode `CREDENTIAL_ENCRYPTION_KEY` as exactly 32 bytes. Use a fresh 12-byte IV per encryption. `audit_events` has no update/delete service. Skill Markdown is stored as text, limited to 256 KiB, and is never executed.

Require exactly one fenced machine-readable block:

````markdown
```connector-manifest
{
  "apiFamily": "x",
  "version": 1,
  "operations": [
    {
      "key": "x.post.metrics",
      "method": "GET",
      "host": "api.x.com",
      "path": "/2/tweets",
      "allowedQueryParameters": ["ids", "tweet.fields", "expansions", "media.fields"],
      "allowedResponseFields": [
        "data.id",
        "data.public_metrics",
        "data.non_public_metrics",
        "data.organic_metrics",
        "data.promoted_metrics"
      ]
    }
  ]
}
```
````

Parse only this JSON block with Zod. Preserve the remaining Markdown as LLM instruction text for the later OpenRouter phase. Save the complete example above in `docs/examples/X_API.example.md` with a short explanatory Markdown section after the manifest.

- [ ] **Step 4: Run checks**

Run: `pnpm test tests/unit/secrets.test.ts tests/integration/audit-skills.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto src/lib/audit src/lib/connectors/skills.ts docs/examples/X_API.example.md tests/unit/secrets.test.ts tests/integration/audit-skills.test.ts
git commit -m "feat: secure connector credentials and skill versions"
```

---

### Task 5: Import and version canonical Notion records

**Files:**
- Create: `src/lib/notion/client.ts`
- Create: `src/lib/notion/canonical.ts`
- Create: `src/lib/notion/validate.ts`
- Create: `src/lib/notion/sync.ts`
- Create: `fixtures/notion/published-valid.json`
- Create: `fixtures/notion/published-invalid.json`
- Create: `fixtures/notion/changed-record.json`
- Create: `tests/unit/notion-validation.test.ts`
- Create: `tests/integration/notion-sync.test.ts`
- Create: `src/app/(dashboard)/settings/notion/page.tsx`
- Create: `docs/runbooks/notion-canonical-setup.md`

**Interfaces:**
- Produces: `validateCanonicalPage(input: unknown): ValidationResult<CanonicalRecord>`
- Produces: `syncNotionWorkspace(input: { workspaceId: string; connectionId: string; actorUserId: string }): Promise<NotionSyncReport>`
- `NotionSyncReport` contains exact arrays: `created`, `updated`, `unchanged`, `archived`, `invalid`.

- [ ] **Step 1: Write failing validation tests**

Fixtures must prove:

- `Published` plus all required fields validates.
- `Draft` is skipped, not invalid.
- Missing parent campaign, invalid date range, or missing display level is invalid.
- Lifecycle status remains an arbitrary non-empty Notion string.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/notion-validation.test.ts`

Expected: FAIL because validation does not exist.

- [ ] **Step 3: Implement read-only Notion canonical DTOs and validation**

Require configured database IDs for Campaigns, Initiatives, Timeline Events, Metric Definitions, and Manual Metric Observations. Query only; do not call Notion create/update/archive endpoints. Normalize Notion IDs without hyphens only for comparisons, but preserve canonical source URLs for citations.

Write `docs/runbooks/notion-canonical-setup.md` with the five database names, exact property names/types from the master design, relation directions, `Publication Status` values, `Display Level` values, and one complete example of Campaign → Initiative → Event → Metric → Observation. This runbook is the curator's setup and cleanup contract.

- [ ] **Step 4: Write and run failing sync-version tests**

Test initial import, identical second sync, changed checksum creating a version, and missing source ID setting `sourceState = "deleted"` without deleting prior data.

Run: `pnpm test tests/integration/notion-sync.test.ts`

Expected: FAIL until `syncNotionWorkspace` is implemented.

- [ ] **Step 5: Implement snapshot-first synchronization**

For each source page:

1. Serialize the raw response with stable key ordering.
2. Hash with SHA-256.
3. Insert immutable source snapshot if checksum is new.
4. Validate.
5. Upsert the current normalized record.
6. Insert a version before changing current normalized fields.
7. After a complete successful database scan, archive previously seen IDs absent from the source.

Do not infer campaign/initiative relationships from text. Only import explicit Notion relations.

- [ ] **Step 6: Run checks and commit**

```bash
pnpm test tests/unit/notion-validation.test.ts tests/integration/notion-sync.test.ts
pnpm typecheck
git add src/lib/notion src/app/'(dashboard)'/settings/notion docs/runbooks/notion-canonical-setup.md fixtures/notion tests/unit/notion-validation.test.ts tests/integration/notion-sync.test.ts
git commit -m "feat: import curated Notion history"
```

---

### Task 6: Build the windowed historical timeline

**Files:**
- Create: `src/lib/timeline/query.ts`
- Create: `src/components/timeline/HistoryTimeline.tsx`
- Create: `src/components/timeline/TimelineEvent.tsx`
- Create: `src/components/timeline/GrowthRail.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/timeline/page.tsx`
- Create: `tests/unit/timeline-layout.test.ts`
- Create: `tests/e2e/timeline.spec.ts`

**Interfaces:**
- Produces: `getTimelineWindow(input: TimelineQuery): Promise<TimelineReadModel>`
- `TimelineQuery` includes `workspaceId`, `start`, `end`, `zoom`, `campaignIds`, `statuses`, `contributors`, and `query`.
- Zoom is exactly `"year" | "quarter" | "month" | "week"`.
- User preference key is `timeline.viewport`.

- [ ] **Step 1: Write failing timeline-layout tests**

Test that:

- Primary markers appear at every zoom.
- Nested markers appear at month/week or when parent is expanded.
- Detail-only rows never create markers.
- Alternating marker sides are stable by `(date, id)` ordering.
- A date range uses its start for the marker and retains its end in details.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/timeline-layout.test.ts`

Expected: FAIL because the layout functions do not exist.

- [ ] **Step 3: Implement the server query and horizontal timeline**

The main DOM contains one scroll container with a central horizontal axis, alternating event callouts, a visible today marker, and left/right continuation affordances. Use semantic buttons for markers and preserve focus. Use URL search parameters for filters and zoom. Save scroll position and zoom after 500 ms of inactivity; restore them unless the URL supplies an explicit date.

The growth rail is collapsible and renders cached observations only. Empty periods render gaps.

- [ ] **Step 4: Add Playwright history behavior**

Seed past, active, and future records. Assert first load centers today, horizontal scrolling works, zoom changes, filter selection reduces markers, and reload restores the viewport.

- [ ] **Step 5: Run checks and commit**

```bash
pnpm test tests/unit/timeline-layout.test.ts
pnpm exec playwright test tests/e2e/timeline.spec.ts --project=chromium
git add src/lib/timeline src/components/timeline src/app/'(dashboard)' tests/unit/timeline-layout.test.ts tests/e2e/timeline.spec.ts
git commit -m "feat: add historical marketing timeline"
```

---

### Task 7: Add initiative drawer, full details, metrics, and citations

**Files:**
- Create: `src/components/initiatives/InitiativeDrawer.tsx`
- Create: `src/components/initiatives/InitiativeDetail.tsx`
- Create: `src/components/metrics/MetricCard.tsx`
- Create: `src/components/metrics/MetricSeries.tsx`
- Create: `src/lib/metrics/calculate.ts`
- Create: `src/lib/metrics/freshness.ts`
- Create: `src/app/(dashboard)/initiatives/[initiativeId]/page.tsx`
- Create: `tests/unit/metrics.test.ts`
- Create: `tests/e2e/initiative-details.spec.ts`

**Interfaces:**
- Produces: `calculateMetric(formulaKey: string, inputs: Record<string, number>): number`
- Supported formula keys in V1: `budget_variance`, `engagement_rate`, `cost_per_result`.
- Produces: `deriveFreshness(input: { observedAt: Date; frozenAt: Date | null; now: Date }): Freshness`

- [ ] **Step 1: Write failing metric tests**

Test exact formulas:

```ts
expect(calculateMetric("budget_variance", { actual: 120, planned: 100 })).toBe(20);
expect(calculateMetric("engagement_rate", { engagements: 25, impressions: 1000 })).toBe(0.025);
expect(() => calculateMetric("cost_per_result", { cost: 20, results: 0 })).toThrow(
  "results must be greater than zero",
);
```

Also test frozen status wins over stale/fresh.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/metrics.test.ts`

Expected: FAIL because metric functions do not exist.

- [ ] **Step 3: Implement details**

The drawer opens through an intercepted route or URL-controlled overlay so deep links work. Closing it returns to the exact timeline URL and scroll position. The full page includes hierarchy, lifecycle status, dates, planned budget, actual spend, contributions, raw metrics, calculated formulas and inputs, citations, last-read status, source version history, and source-deleted flag.

Never render raw credential-bearing request headers or unredacted raw API payloads.

- [ ] **Step 4: Add and run E2E tests**

Assert marker → drawer → full page → back preserves the timeline. Assert raw/calculated labels and citation links.

- [ ] **Step 5: Commit**

```bash
pnpm test tests/unit/metrics.test.ts
pnpm exec playwright test tests/e2e/initiative-details.spec.ts --project=chromium
git add src/components/initiatives src/components/metrics src/lib/metrics src/app/'(dashboard)'/initiatives tests/unit/metrics.test.ts tests/e2e/initiative-details.spec.ts
git commit -m "feat: show initiative evidence and metrics"
```

---

### Task 8: Implement comments, replies, mentions, and notifications

**Files:**
- Create: `src/lib/comments/service.ts`
- Create: `src/lib/notifications/service.ts`
- Create: `src/components/comments/CommentThread.tsx`
- Create: `src/app/(dashboard)/notifications/page.tsx`
- Create: `tests/integration/comments.test.ts`
- Create: `tests/e2e/comments.spec.ts`

**Interfaces:**
- Produces: `createComment(input: CreateCommentInput): Promise<CommentView>`
- Produces: `listComments(workspaceId: string, entityType: "initiative" | "event", entityId: string): Promise<CommentView[]>`
- Mention syntax: `@[Display Name](user:<uuid>)`.

- [ ] **Step 1: Write failing service tests**

Cover top-level comment, one reply, mention notification creation, no notification for self-mention, and rejection when a mentioned user is not a member of the same workspace.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/integration/comments.test.ts`

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement services and UI**

Sanitize comment text as plain text plus parsed mention tokens; do not render arbitrary HTML. Limit comment length to 10,000 characters. Replies have one parent level in V1. A notification links to the entity and comment ID.

- [ ] **Step 4: Run service and E2E checks**

```bash
pnpm test tests/integration/comments.test.ts
pnpm exec playwright test tests/e2e/comments.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comments src/lib/notifications src/components/comments src/app/'(dashboard)'/notifications tests/integration/comments.test.ts tests/e2e/comments.spec.ts
git commit -m "feat: add timeline collaboration"
```

---

### Task 9: Add connector registry, refresh preflight, caps, freeze, and worker

**Files:**
- Create: `src/lib/connectors/types.ts`
- Create: `src/lib/connectors/registry.ts`
- Create: `src/lib/refresh/preflight.ts`
- Create: `src/lib/refresh/jobs.ts`
- Create: `src/lib/refresh/worker.ts`
- Create: `scripts/worker.ts`
- Create: `src/app/api/jobs/[jobId]/route.ts`
- Create: `src/components/settings/RefreshPreflight.tsx`
- Modify: `src/app/(dashboard)/settings/notion/page.tsx`
- Create: `tests/unit/refresh-policy.test.ts`
- Create: `tests/integration/refresh-jobs.test.ts`

**Interfaces:**

```ts
export interface ReadOnlyConnector {
  key: ConnectorKey;
  estimate(request: ConnectorReadRequest): Promise<CostEstimate>;
  validateCapability(request: ConnectorReadRequest): CapabilityResult;
  read(request: ConnectorReadRequest): Promise<ConnectorReadResult>;
}

export interface RefreshPreflight {
  eligible: RefreshObject[];
  frozen: RefreshObject[];
  invalid: RefreshObject[];
  operationCount: number;
  estimatedCostMicros: number;
  periodUsageMicros: number;
  remainingCapMicros: number;
  canApprove: boolean;
  blockers: string[];
}
```

- [ ] **Step 1: Write failing policy tests**

Test:

- A seven-day-old eligible object is allowed immediately before its freeze timestamp.
- It is blocked at or after the freeze timestamp.
- Notion bypasses metric freeze.
- Estimated cost above remaining cap blocks approval.
- A member cannot create or approve a refresh.
- A frozen object never appears in the queued job items.

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/unit/refresh-policy.test.ts`

Expected: FAIL because policy functions do not exist.

- [ ] **Step 3: Implement preflight and PostgreSQL job claiming**

Use a transaction and `SELECT ... FOR UPDATE SKIP LOCKED` to claim one queued job. Store an idempotency key derived from workspace, connection, operation, object, and observation window. The worker writes a raw snapshot before normalization. Do not auto-retry 429/503; store `retryAt` from upstream headers and require admin confirmation for a retry.

Register Notion as a zero-estimated-cost connector that bypasses metric freeze but still requires an admin-confirmed manual job. Wrap `syncNotionWorkspace` rather than duplicating its import logic. Reset usage counters at the start of each UTC calendar month.

- [ ] **Step 4: Run integration checks**

Run:

```bash
pnpm test tests/unit/refresh-policy.test.ts tests/integration/refresh-jobs.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/connectors src/lib/refresh scripts/worker.ts src/app/api/jobs src/app/'(dashboard)'/settings/notion/page.tsx src/components/settings/RefreshPreflight.tsx tests/unit/refresh-policy.test.ts tests/integration/refresh-jobs.test.ts
git commit -m "feat: add guarded manual refresh jobs"
```

---

### Task 10: Implement the three real X read-only contexts

**Files:**
- Create: `src/lib/connectors/x/client.ts`
- Create: `src/lib/connectors/x/post.ts`
- Create: `src/lib/connectors/x/account.ts`
- Create: `src/lib/connectors/x/ads.ts`
- Create: `fixtures/x/post-metrics.json`
- Create: `fixtures/x/account-metrics.json`
- Create: `fixtures/x/ads-metrics.json`
- Create: `fixtures/x/rate-limit.json`
- Create: `tests/contract/x-post.test.ts`
- Create: `tests/contract/x-account.test.ts`
- Create: `tests/contract/x-ads.test.ts`

**Interfaces:**
- Produces: `xPostConnector`, `xAccountConnector`, `xAdsConnector` satisfying `ReadOnlyConnector`.
- Allowlisted hosts: `api.x.com` and `ads-api.x.com`.
- Allowlisted HTTP method: `GET` only for the first build.
- Every operation must exist in the active skill's validated `connector-manifest`.

- [ ] **Step 1: Write failing contract tests from sanitized real-shaped fixtures**

Post test expects public, non-public, organic, and promoted fields only when present. Account test expects supported `public_metrics` such as followers and post count. Ads test expects requested entity metrics and converts `billed_charge_local_micro` to workspace currency units without losing the raw micro value.

Add one explicit test proving a requested account metric absent from the response returns:

```ts
{
  supported: false,
  code: "CAPABILITY_UNAVAILABLE",
  message: "X did not expose this metric for the configured account and authentication context."
}
```

- [ ] **Step 2: Verify failure**

Run: `pnpm test tests/contract/x-post.test.ts tests/contract/x-account.test.ts tests/contract/x-ads.test.ts`

Expected: FAIL because X adapters do not exist.

- [ ] **Step 3: Implement the allowlisted X client**

Rules:

- Use user-context authentication for owned organic/non-public post metrics.
- Request only fields declared by the active `X_API.md` skill and connector manifest.
- Reject an arbitrary URL, host, method, or field.
- Preserve X response metadata and rate-limit headers in the raw snapshot.
- Ads synchronous requests must use whole-hour ISO timestamps and a maximum seven-day range.
- Treat Ads API end time as exclusive.
- Do not implement write endpoints even if the supplied X credentials permit them.

- [ ] **Step 4: Run contract tests and one admin-confirmed live smoke test**

Run fixtures first:

```bash
pnpm test tests/contract/x-post.test.ts tests/contract/x-account.test.ts tests/contract/x-ads.test.ts
```

Then, with production credentials loaded outside git, use the admin preflight to read one recent owned post, one account snapshot, and one one-day Ads window. Record only redacted fixture-compatible responses.

Expected: fixture tests pass; live smoke test stores three separate source snapshots and no write request appears in logs.

- [ ] **Step 5: Commit**

```bash
git add src/lib/connectors/x fixtures/x tests/contract
git commit -m "feat: import separate X analytics contexts"
```

---

### Task 11: Build admin settings, validation, and audit pages

**Files:**
- Create: `src/app/(dashboard)/settings/layout.tsx`
- Create: `src/app/(dashboard)/settings/connections/page.tsx`
- Create: `src/app/(dashboard)/settings/users/page.tsx`
- Create: `src/app/(dashboard)/settings/audit/page.tsx`
- Create: `src/components/settings/ConnectionForm.tsx`
- Create: `src/components/settings/SkillVersionForm.tsx`
- Create: `src/components/settings/SpendingCapForm.tsx`
- Create: `tests/e2e/admin-settings.spec.ts`

**Interfaces:**
- All state-changing settings actions call `requireWorkspaceAdmin`.
- Connection list responses exclude ciphertext.
- Skill activation displays version and checksum.

- [ ] **Step 1: Write failing admin E2E tests**

Assert a member receives 403/redirect for settings mutations. Assert an admin can create named Notion and X connections, upload an `X_API.md` under 256 KiB, activate a version, set a hard cap, and view matching audit events. Assert credential values never reappear after submission.

- [ ] **Step 2: Verify failure**

Run: `pnpm exec playwright test tests/e2e/admin-settings.spec.ts --project=chromium`

Expected: FAIL because settings pages do not exist.

- [ ] **Step 3: Implement admin pages**

Use server actions or route handlers with server-side authorization. Show connection health, last successful read, last error, active skill version, current-period usage, hard cap, and freeze policy. Every credential rotation and cap change requires an explicit confirmation form submission and audit event.

- [ ] **Step 4: Run checks**

```bash
pnpm exec playwright test tests/e2e/admin-settings.spec.ts --project=chromium
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/'(dashboard)'/settings src/components/settings tests/e2e/admin-settings.spec.ts
git commit -m "feat: add workspace administration"
```

---

### Task 12: Containerize, proxy, back up, and restore

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `Caddyfile`
- Create: `scripts/backup.sh`
- Create: `scripts/restore.sh`
- Create: `docs/runbooks/deployment.md`
- Create: `docs/runbooks/backup-restore.md`
- Create: `tests/ops/backup-restore.sh`

**Interfaces:**
- Compose services: `web`, `worker`, `postgres`, `caddy`.
- Only Caddy exposes host ports 80/443.
- PostgreSQL is internal-only.
- Backup output: encrypted PostgreSQL custom dump named `*.dump.age`.

- [ ] **Step 1: Verify the Docker prerequisite**

Run:

```bash
docker --version
docker compose version
docker compose -f docker-compose.test.yml ps
```

Expected: Docker and Compose succeed; `postgres-test` is healthy.

- [ ] **Step 2: Write the failing backup/restore test**

The script creates a disposable database, inserts a workspace plus one campaign, runs backup, restores to a second disposable database, and asserts the restored campaign exists. It must fail if the backup key is absent or wrong.

- [ ] **Step 3: Implement deployment files and scripts**

Requirements:

- Multi-stage Node 24 image.
- Web and worker use the same immutable image.
- Health check calls `/api/health`.
- Database migration runs as an explicit deployment step, not on every web replica start.
- Caddy terminates HTTPS and proxies only to `web`.
- Install `age` and `awscli` from the Ubuntu package repository.
- Backup uses `pg_dump --format=custom | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT"`.
- Upload uses `aws s3 cp --endpoint-url "$BACKUP_S3_ENDPOINT"`.
- Restore uses `age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" | pg_restore`.
- The age identity file is supplied separately, must be mode `0600`, and is never stored in the backup archive.
- Restore refuses to target the configured production database name.

- [ ] **Step 4: Run operational verification**

```bash
docker compose config
docker compose build
docker compose up -d postgres
pnpm db:migrate
bash tests/ops/backup-restore.sh
docker compose down
```

Expected: config/build/migration/restore pass.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml Caddyfile scripts/backup.sh scripts/restore.sh docs/runbooks tests/ops
git commit -m "ops: add VPS deployment and recovery"
```

---

### Task 13: Prove acceptance criteria and deploy the first build

**Files:**
- Create: `tests/e2e/acceptance.spec.ts`
- Create: `scripts/seed-acceptance.ts`
- Modify: `.env.example`
- Modify: `docs/runbooks/deployment.md`
- Modify: `docs/superpowers/specs/2026-07-24-marketing-timeline-dashboard-design.md`

**Interfaces:**
- Produces: one repeatable acceptance command: `pnpm test:acceptance`.
- Production seed creates the first admin only when `BOOTSTRAP_ADMIN_EMAIL` exactly matches the Google account.

- [ ] **Step 1: Add the acceptance script and failing E2E suite**

Add:

```json
{
  "scripts": {
    "test:acceptance": "vitest run && playwright test tests/e2e/acceptance.spec.ts --project=chromium"
  }
}
```

The browser/API suite covers master acceptance criteria 1–19. `tests/ops/backup-restore.sh` covers criterion 20. OpenRouter, xAI, and later connectors must not be marked as implemented.

- [ ] **Step 2: Run the complete acceptance suite**

Run: `pnpm test:acceptance`

Expected: PASS. If it fails, do not patch broadly in this task. Return to the task that owns the failed behavior, add the missing focused test there, make it pass, and then rerun this step.

- [ ] **Step 3: Run the complete verification matrix**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test --project=chromium
docker compose config
bash tests/ops/backup-restore.sh
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 4: Deploy and conduct real-source acceptance**

1. Configure production environment outside git.
2. Start PostgreSQL.
3. Apply migrations.
4. Start web, worker, and Caddy.
5. Bootstrap the invited admin.
6. Connect the curated Notion databases.
7. Sync a representative published campaign, initiative, event, metric definition, and manual observation.
8. Connect X credentials.
9. Run admin-confirmed smoke reads for post, account, and ads contexts.
10. Confirm logs contain no write method to Notion or X.
11. Run one encrypted backup and isolated restore.
12. Record deployment timestamp and commit SHA in the audit log.

- [ ] **Step 5: Update design implementation status and commit**

Change only the design status line from `Approved design` to `First build deployed` after production acceptance succeeds.

```bash
git add .
git commit -m "test: verify first production build"
```

## Goal-worker operating instructions

Use this exact execution discipline when launching the `/goal` worker:

1. Objective: “Autonomously implement every unchecked item in `docs/superpowers/plans/2026-07-24-first-build.md` in order, publish and merge the verified pull request, and deploy the accepted first build from `main`. Do not implement deferred scope and do not pause for routine approval.”
2. Ask the worker to read the master design and this plan before editing.
3. Do not let it rewrite the plan to reduce scope.
4. Require it to update checkboxes only after the named verification command passes.
5. Require one commit per task with the specified message or a more precise equivalent.
6. If credentials, domain, SMTP, S3-compatible backup destination, Google OAuth client, Notion database IDs, or X account IDs are missing, the worker must finish all credential-independent work and report the exact missing values. It must not invent them.
7. If an X metric is unavailable under the real authentication context, the worker must implement and display `CAPABILITY_UNAVAILABLE`; it must not approximate the metric.
8. The worker may perform the plan's required one-time production smoke reads without another chat approval only after valid credentials and hard caps are configured. It must not make unrelated, repeated, or uncapped paid API calls.
9. Start from `main` on an `agent/first-build` branch. Never implement directly on `main`.
10. Push the branch and open a draft pull request after the first implementation commit, then keep its description, validation results, and branch current throughout execution.
11. Before merging, run the complete required test and acceptance suite, inspect the final diff for scope and secrets, and resolve all actionable failures. Mark the pull request ready and merge it only when every required check passes.
12. After merging, deploy the merged `main` commit and rerun production acceptance. Record the deployed commit SHA.
13. Do not ask for approval for routine file edits, dependency installation, migrations covered by this plan, commits, pushes, pull-request updates, merge, or deployment.
14. Stop only when a required secret or external account value is unavailable, a destructive action outside the repository would be required, required checks remain unresolvable after diagnosis, or the PRD lacks a product decision that would materially change the result. Report the exact blocker and preserve all completed work.
15. Keep the goal active until the production acceptance matrix passes or one of the genuine blockers in item 14 is reached.

## Required human-provided production inputs

The build can proceed without these values using fixtures, but production acceptance requires:

- Public production domain pointing to the VPS
- Google OAuth client ID and secret with the production callback URL
- SMTP URL and sender address for invitation email
- Initial admin Google email
- PostgreSQL production password
- 32-byte application credential-encryption key
- Notion integration token
- IDs of the five canonical Notion databases
- X user-context credentials for owned post/account metrics
- X Ads credentials and ads account ID
- First active `X_API.md`
- Workspace base currency
- Per-connector hard caps
- Per-connector freeze policies, or approval to use the seven-day defaults
- S3-compatible off-VPS backup bucket, endpoint, credentials, age recipient, and separately stored age identity file

## Primary implementation references

- [Master product requirements and design](../specs/2026-07-24-marketing-timeline-dashboard-design.md)
- [Next.js installation and App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js backend-for-frontend guidance](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Auth.js Next.js setup](https://authjs.dev/)
- [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [X post and media metrics](https://docs.x.com/x-api/fundamentals/metrics)
- [X Ads analytics](https://docs.x.com/x-ads-api/analytics)
- [Playwright installation](https://playwright.dev/docs/intro)
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

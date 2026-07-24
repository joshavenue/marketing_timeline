# Marketing Timeline Dashboard — Master Product Requirements and Design

**Status:** Approved design draft for user review  
**Date:** 2026-07-24  
**Deployment target:** Self-hosted VPS  
**Initial workspace:** Tessera Lab  
**Primary decision:** Explain which past marketing initiatives aligned with company growth using cited source evidence.

## 1. Executive summary

The Marketing Timeline Dashboard is a private, self-hosted history of a company's marketing work. Its main interface is a horizontally scrollable timeline running from past to present to future. Campaigns, initiatives, activities, budgets, contributors, outcome metrics, comments, and source citations are connected in one chronological view.

Notion remains the editable source of truth for marketing plans and human-curated historical records. External APIs remain authoritative for imported measurements. The dashboard does not silently rewrite either source. It stores versioned snapshots on the VPS, calculates explicitly defined derived metrics, and provides a clearer historical and analytical presentation.

The product answers questions such as:

- What marketing work occurred around a change in company growth?
- Which campaign, initiative, and activity contributed to a period?
- What was planned, what was spent, and who contributed?
- Which metrics moved during the initiative's attribution window?
- Where did each value come from, when was it read, and is it now frozen?
- What did the team record about the initiative before, during, and after it?

The first deployable vertical slice is intentionally small enough to target delivery in under one week. It prioritizes Google sign-in, canonical Notion import, the historical timeline, initiative details, native comments, and the three separately presented X analytics contexts.

## 2. Problem statement

The current Notion workspace contains useful evidence, but it is fragmented across pages, databases, and manually maintained tables.

Direct inspection of the Tessera Lab workspace found:

- `Marketing Initiative Recap` mixes monthly chronology, thematic campaign summaries, long-running initiatives, tasks, expenses, launches, content, and results.
- Its embedded `Marketing Initiatives 2026` database contains only `Initiative`, `Date`, and free-text `Context / Interpretation`.
- Durations, budgets, contributors, campaign relationships, sources, and outcomes are frequently embedded in prose.
- `Weekly Analytics for Growth` stores follower growth, site traffic, holders, X performance, and other measurements in unrelated wide tables using weekly ranges.
- Metric tables have no stable relations to campaigns or initiatives.
- The same real-world effort may appear as several equally weighted records or be duplicated between chronology and summary sections.

This makes it difficult to interpret marketing buildup across time. It also encourages retrospective manual reconstruction and leaves attribution assumptions implicit.

The product does not attempt to solve this by asking AI to clean inconsistent history automatically. A human curator creates canonical records in Notion and explicitly controls whether and how they appear.

## 3. Product goals

### 3.1 Primary goal

Enable a CMO or marketing team member to explain major company-growth changes by reviewing the marketing initiatives that occurred during the same periods, with direct citations to source records and metrics.

### 3.2 Launch success criteria

The first production release succeeds when all of the following are true:

1. The available marketing history can be reconstructed and inspected from one timeline.
2. Major growth changes can be investigated using cited initiatives and source measurements.
3. Monthly reporting preparation requires materially less manual reconstruction.
4. The CMO and marketing team can use the product regularly without generating unattended API costs.

### 3.3 Product principles

- **History first:** The homepage feels like a historical chronology, not a project-management Gantt chart.
- **Human-curated meaning:** A designated curator determines classification, relationships, prominence, and publication in Notion.
- **Read-only evidence:** Source records and API measurements cannot be edited from the dashboard.
- **Explicit derivation:** Calculations and attribution are labeled separately from raw source facts.
- **Cost by consent:** Paid reads and AI work occur only after an admin sees scope and estimated cost.
- **Traceability:** Values, interpretations, configuration changes, and source deletions remain auditable.
- **Progressive detail:** The main timeline stays readable; details are available through expansion, a drawer, and a full page.

## 4. Users, authentication, and permissions

### 4.1 Workspace model

The initial deployment serves one company, but every application record is scoped by workspace so the architecture can support isolated multi-tenant workspaces later.

### 4.2 Authentication

- Users are invited by email.
- An admin enters the invited email address and the application sends a single-use invitation link through VPS-configured SMTP.
- A failed delivery leaves the invitation pending and lets the admin resend it or copy the invitation link.
- Sign-in uses Google OAuth.
- A Google account may sign in only when its email matches an active invitation.
- Removing a user immediately ends new access; existing sessions are invalidated.

### 4.3 Roles

Permissions are workspace-wide in V1.

**Admin**

- Full workspace access
- Invite and remove users
- Manage Notion and API connections
- Manage encrypted credentials
- Upload and activate API skill documents
- Select OpenRouter models and fallback
- Configure spending caps and freeze rules
- Preview, start, cancel, or retry refreshes
- Review validation and connector errors
- View the audit log

**Member**

- View all published workspace timeline data
- View metrics, calculations, citations, and record history
- Comment, reply, and mention workspace users
- Receive in-app notifications
- Use the factual timeline assistant
- Cannot trigger external API reads or alter configuration

Granular campaign or initiative permissions and a read-only viewer role are excluded from V1.

## 5. Scope

### 5.1 One-week vertical slice

- VPS deployment
- Google OAuth and email invitation allowlist
- Admin and Member roles
- Canonical Notion connection and manual synchronization
- Notion validation report
- Historical timeline homepage
- Past, present, and future navigation
- Year, quarter, month, and week zoom
- Campaign, lifecycle status, contributor, date range, and text filters
- Initiative/event side drawer and dedicated detail page
- Planned budget and actual spend
- Contribution log
- Raw and calculated metric presentation
- Source citations and source-state indicators
- Comments, replies, mentions, and in-app notifications
- X per-post organic metrics
- X account analytics
- X Ads analytics
- Separate contextual views for the three X surfaces
- Manual refresh preflight and confirmation
- Configurable caps and freeze policies
- Connector audit history

### 5.2 Near-term phases

- Google Analytics 4 adapter
- Helius adapter
- Direct Metabase adapter
- xAI post-sentiment analysis
- OpenRouter factual timeline assistant
- Additional named connections for each connector type
- API-specific skill upload and version workflow
- Synchronized company-growth rail when more external metrics are connected

The modular boundaries for these capabilities are part of V1 even when a connector is delivered afterward.

### 5.3 Explicit non-goals for V1

- Editing imported campaigns, initiatives, activities, budgets, or measurements
- Automatically cleaning or classifying the existing Notion workspace
- Scheduled or background polling of paid APIs
- API write, push, mutation, advertising-management, or content-publishing operations
- Native campaign or initiative creation
- PDF or CSV exports
- Saved assistant conversations
- AI recommendations or causal claims
- Custom per-object permissions
- Microservices, distributed queues, or infrastructure unnecessary at the initial scale

## 6. Core experience

### 6.1 Timeline homepage

The homepage uses a single horizontal chronological axis inspired by a historical-event timeline.

- Time flows from left to right: past, present, future.
- Event callouts alternate above and below the axis.
- The first visit centers on today.
- Later visits restore the user's last timeline position and zoom.
- Users can jump back to today.
- The timeline supports year, quarter, month, and week presets.
- Horizontal scrolling is the primary navigation gesture.
- Published campaign, initiative, milestone, and activity markers use distinct visual treatments.
- The curator controls each published record's display level:
  - `Primary marker`
  - `Nested activity`
  - `Detail only`
- Primary markers remain visible at broader zoom levels.
- Nested activities appear when their parent is expanded or the user zooms in.
- Overlapping events cluster without losing their individual records.
- Future events show planned values and targets without implying results.
- Present or active initiatives are visually distinct from completed and future work.

Default filters are campaign, Notion lifecycle status, contributor, date range, and text search.

### 6.2 Growth analysis

The historical timeline remains the primary page. Growth analysis supports it instead of replacing it.

- A collapsible, synchronized growth rail uses the same time scale and scroll position.
- The user chooses a Notion-defined metric.
- Vertical alignment guides make timing comparable.
- Raw measurements are visually separated from calculated attribution.
- The UI never claims that temporal alignment proves causation.
- Metrics without data for a period display a gap rather than an interpolated fact.

### 6.3 Event selection

Selecting a marker opens a side drawer while preserving the timeline position.

The drawer contains:

- Name, type, campaign, and initiative hierarchy
- Date or date range
- Notion lifecycle status
- Summary and context
- Planned budget and actual spend
- Contribution entries
- Metric summary
- Source links and freshness
- Comment preview
- Link to open the dedicated page

The full detail page adds:

- Time-series charts
- Attribution comparison
- Raw source measurements
- Deterministic calculated metrics and formulas
- Calculation inputs and timestamps
- Source snapshot/version history
- Source-deleted or source-changed indicators
- Complete comments and replies
- Complete source-version history

### 6.4 Comments and notifications

Comments are the principal native editable content.

- Members and admins can comment.
- Comments support replies and `@mentions`.
- Comments display author and timestamp.
- Mentioned users receive an in-app notification.
- V1 does not include reactions, assignments, resolution states, or email notifications.
- Imported Notion comments are not merged with native dashboard comments.

### 6.5 Factual assistant

The assistant is a lightweight retrieval interface over the permitted timeline history.

- It searches campaigns, initiatives, events, contribution records, metrics, and citations.
- Answers are factual summaries only.
- Every material claim links to the relevant dashboard record and source.
- It does not infer hidden relationships, recommend strategy, or claim causality.
- Conversation state is ephemeral and deleted when the session ends.
- It never receives connector secrets.
- Cached product records are preferred over new API calls; assistant questions do not trigger connector reads.

## 7. Canonical Notion information model

### 7.1 Marketing HQ

A new `Marketing HQ` page contains linked views of five related databases. Existing messy pages remain in place and are referenced as evidence.

### 7.2 Campaigns database

Required properties:

| Property | Type | Purpose |
|---|---|---|
| Campaign | Title | Canonical campaign name |
| Lifecycle Status | Notion status | Exact status displayed by the website |
| Publication Status | Notion status | `Draft`, `Ready for Review`, `Published` |
| Start Date | Date | Campaign start |
| End Date | Date | Campaign end when known |
| Owner | Person | Accountable owner |
| Objective | Text | Strategic purpose |
| Initiatives | Relation | Child initiatives |
| Source Records | Rich text | One or more linked original pages and evidence records |
| Display Level | Select | Primary marker, nested activity, or detail only |

Campaign budget is calculated as a roll-up of related initiative values rather than entered twice.

### 7.3 Initiatives database

Required properties:

| Property | Type | Purpose |
|---|---|---|
| Initiative | Title | Canonical initiative name |
| Campaign | Relation | Parent campaign |
| Lifecycle Status | Notion status | Existing workflow status |
| Publication Status | Notion status | Curation workflow |
| Start Date | Date | Start or milestone date |
| End Date | Date | Optional end date |
| Owner | Person | Accountable owner |
| Planned Budget | Number | Workspace base currency |
| Actual Spend | Number | Workspace base currency |
| Overview | Text | Concise factual description |
| Events & Contributions | Relation | Child activity records |
| Metrics | Relation | Relevant metric definitions |
| Attribution Template | Select | Stable key for a reusable website attribution template |
| Source Records | Rich text | One or more linked original pages and evidence records |
| Display Level | Select | Timeline prominence |

V1 uses one base currency configured at workspace level.

### 7.4 Timeline Events & Contributions database

This database records factual work, launches, milestones, posts, and outcomes.

| Property | Type | Purpose |
|---|---|---|
| Event / Work Performed | Title | Short factual entry |
| Initiative | Relation | Parent initiative |
| Event Type | Select | Activity, post, milestone, launch, outcome, or other curated type |
| Publication Status | Notion status | Curation workflow |
| Start Date | Date | Single date or range start |
| End Date | Date | Optional range end |
| Contributors | People/relation | Person or people responsible |
| Context | Text | Relevant factual explanation |
| External Object URLs | Rich text | One or more X posts or other source objects |
| Source Records | Rich text | One or more linked original Notion evidence records |
| Display Level | Select | Primary marker, nested activity, or detail only |

The visible contribution format remains simple:

`Work performed | Contributor(s)`

### 7.5 Metric Definitions database

Metric definitions are dynamic and originate in Notion.

| Property | Type | Purpose |
|---|---|---|
| Metric | Title | Display label |
| Metric Type | Select | Raw source or calculated |
| Connector Type | Select | Notion, X Post, X Account, X Ads, GA4, Helius, Metabase, or future type |
| Named Connection | Text | Stable handle of the configured account/property that supplies data |
| External Metric Key | Text | Stable API field, query, or report identifier |
| Unit | Select | Count, currency, percentage, duration, or custom |
| Aggregation | Select | Sum, latest, average, change, ratio, or connector-defined |
| Target | Number | Optional planned outcome |
| Related Campaigns | Relation | Relevant campaigns |
| Related Initiatives | Relation | Relevant initiatives |
| Attribution Template | Select | Stable key of the default measurement method |
| Override Window Days | Number | Optional initiative-specific duration |
| Formula | Select | Allowlisted deterministic formula key |
| Formula Inputs | Relation | Source metrics used by a calculation |
| Publication Status | Notion status | Curation workflow |

Credentials never appear in Notion.

### 7.6 Manual Metric Observations database

This database supports normalized values copied from Metabase or other manually accessed systems.

| Property | Type | Purpose |
|---|---|---|
| Observation | Title | Human-readable record |
| Metric | Relation | Metric definition |
| Period Start | Date | Observation window start |
| Period End | Date | Observation window end or point date |
| Value | Number | Unformatted numeric value |
| Source Reference | URL | Report, query, dashboard, or original table |
| Notes | Text | Factual caveat |
| Publication Status | Notion status | Curation workflow |

Values such as `523.1K` are normalized to numeric values such as `523100`; formatting occurs in the website.

### 7.7 Curation workflow

1. The curator reviews existing evidence.
2. The curator creates or updates canonical records.
3. Original pages remain linked through `Source Records`.
4. The curator assigns hierarchy, dates, contributors, metrics, and display level.
5. The record moves from `Draft` to `Ready for Review`.
6. The curator or authorized reviewer changes it to `Published`.
7. The next manual Notion sync validates and imports it.

The dashboard does not publish incomplete records automatically.

## 8. Metrics, ROI, and attribution

### 8.1 Raw metrics

A raw metric is a value imported from one authoritative source, such as:

- Actual spend from Notion
- Post impressions from X
- Account follower count from X Analytics
- Paid conversions from X Ads Analytics
- New wallets from Helius

### 8.2 Calculated metrics

Calculated metrics use allowlisted deterministic formulas over raw values, for example:

- Cost per acquired wallet = actual spend / new wallets
- Budget variance = actual spend - planned budget
- Engagement rate = engagements / impressions

Calculated metrics display:

- Formula
- Input values
- Input source citations
- Observation windows
- Calculation timestamp
- Formula version

Calculated values are never presented as source facts.

### 8.3 Attribution

The product uses a hybrid attribution model:

- Raw time alignment is always available for human interpretation.
- Configured attribution applies deterministic baseline, measurement-window, and comparison rules.
- The website provides reusable default templates.
- A Notion metric or initiative may override the default.
- Calculated attribution is visibly labeled and never treated as proof of causality.

AI is not used to generate attribution values.

## 9. System architecture

### 9.1 Architectural style

The application is a lightweight TypeScript modular monolith deployed through Docker Compose.

Runtime units:

- Web application and internal API
- Worker process using the same codebase
- PostgreSQL database
- HTTPS reverse proxy
- Encrypted off-VPS backup target

The system does not require Redis, Kubernetes, or separately deployed microservices in V1. Refresh jobs use a PostgreSQL-backed job table so they survive web-process restarts.

### 9.2 Core modules

- Authentication and invitations
- Workspace and roles
- Notion synchronization and validation
- Connector registry
- Named connector connections
- API skill registry and versioning
- Refresh preflight and job execution
- Raw source snapshot store
- Normalization and source versioning
- Metrics and deterministic calculation engine
- Timeline query and presentation
- Comments and notifications
- Factual retrieval assistant
- Cost ledger and caps
- Audit log
- Backup and recovery tooling

Each module exposes a typed interface and owns one bounded responsibility.

### 9.3 Data flow

Every external refresh follows:

`Scope selection → Cost preview → Admin confirmation → Policy checks → Read-only API call → Immutable raw snapshot → Validation → Normalization → Version comparison → Metric calculation → Timeline availability`

Cached timeline browsing does not trigger this flow.

### 9.4 Source snapshots and versions

- Raw connector responses are stored with connector, connection, object identifier, request scope, timestamp, and checksum.
- Normalized records reference the raw snapshot that produced them.
- A changed Notion record creates a new normalized version.
- Previous versions remain available.
- A Notion record deleted at the source becomes archived and receives a visible source-deleted flag.
- Historical data remains available even when a connector is disconnected.
- Imported observations are retained indefinitely unless the workspace is explicitly deleted.

## 10. Connectors and API skills

### 10.1 Connector model

A workspace may configure multiple named connections of the same connector type, such as several X accounts or GA4 properties.

Each connector is read-only and defines:

- Credential type
- Allowlisted hostnames
- Allowlisted read operations
- Typed request parameters
- Typed response schema
- Cost estimation method
- Default freeze rule
- Normalization interface
- Health-check behavior

### 10.2 API-specific skill documents

Each API family has one dedicated instructional document, for example `X_API.md`.

It teaches the integrated LLM:

- Available read operations
- Required and optional parameters
- Endpoint-selection rules
- Response-field meanings
- Metric-mapping rules
- Context-specific interpretation
- Prohibited operations

One skill version is active for a connector type. Prior versions remain available.

The document is not executable code. The LLM may select and parameterize an approved read operation, but a deterministic guard enforces allowlisted domains, methods, schemas, caps, freeze rules, and credential boundaries. Deterministic product output comes from validation, normalization, caching, and fixed calculations rather than from the LLM itself.

A changed skill displays a version diff and impact preview. Reprocessing historical cached records requires explicit admin selection and confirmation.

### 10.3 X contexts

X data is presented as three separate contexts:

1. Per-post organic metrics
2. Account-level X Analytics
3. X Ads Analytics

They may share credentials or API skill guidance, but they have separate retrieval operations, normalization, displays, caps, and refresh eligibility.

### 10.4 Notion behavior

- Notion is manually synchronized.
- It may be synchronized indefinitely because it contains evolving plans and canonical history.
- The seven-day metric freeze does not apply to Notion.
- Published records that fail validation are excluded and reported.
- Notion synchronization never writes back to the workspace.

## 11. Refresh, cost, and freeze policy

### 11.1 Manual refresh only

Only an admin can trigger external reads.

The preflight shows:

- Selected connector and named connection
- Campaign, initiative, objects, or date range in scope
- Eligible objects
- Frozen objects
- Invalid objects
- Expected operations
- Estimated API or model cost
- Current period usage
- Remaining hard cap

The admin confirms before work starts.

### 11.2 Caps

- Each connector and model has a separate hard cap.
- Admins may raise or lower a cap at any time.
- A blocked operation remains blocked until an admin changes the cap and confirms a new preflight.
- Cap changes and overrides are audited.
- There is no silent fallback to a different paid model or connector.

### 11.3 Freeze rules

Freeze rules are configurable per connector. The default follows the source object's age.

Examples:

- X post metrics freeze seven days after publication.
- Account analytics observations freeze seven days after the observation-window end.
- Ad observations use their configured object or observation-window date.

Once an observation is frozen, the application does not issue new read calls for that object and interval. Frozen values remain visible with their last-read timestamp.

### 11.4 xAI sentiment

- Sentiment analysis runs once when explicitly requested for an imported post.
- An admin may re-run it with a reason, such as including reply context.
- Re-runs require cost preview and confirmation.
- Prior interpretations remain versioned.
- Sentiment is labeled as AI-derived interpretation, never as an X source fact.

## 12. OpenRouter and factual assistant

- The workspace supplies its own OpenRouter API key.
- The seeded default model identifier is `google/gemma-4-31b-it`.
- An admin may enter a different OpenRouter model identifier.
- An admin may configure one explicit fallback model.
- An unavailable or invalid model causes a visible configuration error if no valid fallback exists.
- Fallback use is reported; it is never silent.
- Assistant responses use cached workspace records and citations.
- Assistant conversations are not retained after the session.
- Model spending uses its own admin-configurable hard cap.

## 13. Error handling

### 13.1 Connection errors

- Expired or revoked credentials mark the named connection unhealthy.
- Cached data remains available.
- The UI shows the failed operation and corrective action.
- Secrets are never echoed.

### 13.2 Rate limits and upstream outages

- The affected connector job pauses or fails with the upstream retry time.
- The system does not create an uncontrolled retry loop.
- An admin explicitly retries after a fresh preflight.

### 13.3 Schema drift

- Responses that fail the active schema are quarantined.
- The prior normalized version remains visible.
- The admin sees the affected connector, operation, objects, and schema mismatch.
- A new connector or skill version can be previewed against quarantined snapshots before activation.

### 13.4 Notion validation

Invalid published records are not partially displayed. The validation report identifies:

- Record and source link
- Missing or invalid property
- Expected format
- Corrective action

### 13.5 Partial refreshes

- Success and failure are tracked per source object or observation window.
- Successful immutable snapshots are retained.
- Failed items preserve their prior visible values.
- Refresh jobs use idempotency keys so retries do not duplicate stored observations.

### 13.6 User-visible state

Every metric shows:

- Source
- Named connection
- Observation period
- Last successful read
- Fresh, stale, or frozen status
- Raw or calculated status
- Source citation

No failure silently replaces, deletes, or fabricates a value.

## 14. Security, privacy, and audit

- Every database query is workspace-scoped.
- Connector credentials, OAuth tokens, and model keys are encrypted at rest.
- Secrets never enter prompts, logs, source snapshots, or browser payloads.
- HTTPS and secure session cookies are mandatory.
- OAuth uses the minimum read scopes required by each connector.
- Server-side authorization protects every admin operation.
- CSRF protection covers state-changing browser actions.
- API skill documents are treated as untrusted instructions and cannot execute code.
- Connector hostnames, methods, and request schemas are allowlisted.
- Audit events include invitations, removals, role changes, connector changes, credential rotation, caps, refreshes, retries, skill activation, reprocessing, model configuration, and workspace deletion.

## 15. Backup and recovery

- PostgreSQL receives an automated encrypted daily backup.
- Backups are stored outside the VPS.
- Backup retention is configurable operationally without changing product history retention.
- A documented restore command and checklist are maintained.
- Restore is rehearsed against a non-production database before launch and periodically afterward.
- A restore preserves workspace boundaries, source versions, comments, audit history, and connector configuration.
- Backups include only encrypted credential ciphertext. The encryption key is stored separately from both the VPS and backup archive and is required during restore.

## 16. Performance and scale

Initial design target:

- 11–50 registered users
- Fewer than 100 canonical timeline events at launch
- All available historical records may be backfilled over time
- Usable behavior through at least 1,000 events

Targets:

- Cached timeline browsing issues zero connector calls.
- The initial timeline becomes interactive within approximately three seconds under normal VPS load.
- Timeline queries are paginated or windowed.
- Detail data loads on demand.
- External refresh and AI work runs in the worker with visible progress.
- The web process remains responsive during refresh jobs.

## 17. Testing strategy

### 17.1 Unit tests

- Date and range normalization
- Publication-state filtering
- Display-level rules
- Freeze eligibility
- Cap enforcement
- Cost calculations
- Attribution windows
- Deterministic formulas
- Permission checks
- Source freshness states
- Schema validation

### 17.2 Connector contract tests

- Recorded fixtures for Notion
- Recorded fixtures for X post metrics
- Recorded fixtures for X account analytics
- Recorded fixtures for X Ads analytics
- Invalid, incomplete, rate-limited, and changed-schema fixtures
- No paid API calls in continuous integration

### 17.3 Integration tests

- Notion publish-to-import flow
- Version creation after source edits
- Archiving after source deletion
- Refresh idempotency
- Partial-success behavior
- Skill-version preview and explicit reprocessing
- Comments, replies, mentions, and notifications
- Workspace isolation
- Encrypted secret storage and log redaction

### 17.4 End-to-end tests

- Invite and Google sign-in
- First-visit today position and remembered position
- Timeline scrolling, zooming, filtering, and expansion
- Marker to drawer to full-page navigation
- Cost preview and confirmation
- Cap-blocked refresh
- Frozen-object rejection
- Source citations
- Factual assistant citation behavior

### 17.5 Recovery test

An encrypted production-like backup is restored into an isolated database. The restored application must reproduce users, timeline records, comments, source versions, and audit history without contacting external APIs.

## 18. Acceptance criteria

V1 is accepted when:

1. An invited user can sign in with Google.
2. An uninvited Google account cannot access the workspace.
3. A published valid Notion record appears at the correct timeline date.
4. A draft or review-stage Notion record does not appear.
5. An invalid published record appears in the validation report with a corrective action.
6. The curator's display level controls marker prominence.
7. A timeline marker opens the correct drawer without losing scroll position.
8. The full page shows budget, contributions, metrics, formulas, comments, citations, and source history.
9. X post, account, and ads analytics appear in separate contextual views.
10. A manual refresh displays scope, cost estimate, cap state, and freeze exclusions before confirmation.
11. A frozen observation cannot issue a new read.
12. Cached browsing never triggers an external API call.
13. A changed Notion record creates a visible version.
14. A deleted Notion source remains archived and flagged.
15. Raw and calculated metrics are visually distinct.
16. Every metric exposes its source and last successful read.
17. Members cannot access admin refresh or credential operations.
18. Comments, replies, mentions, and in-app notifications work.
19. Audit history records all material admin operations.
20. A backup can be restored successfully.

## 19. Delivery framing

The one-week target is a deployable vertical slice, not the completed connector ecosystem.

Recommended sequence:

1. Project foundation, deployment baseline, database, authentication, and workspace roles
2. Canonical domain model, Notion validation, synchronization, and versions
3. Historical timeline, filters, zoom, drawer, and detail page
4. Budgets, contributions, metrics, citations, comments, and notifications
5. X connector contexts, refresh preflight, caps, and freeze enforcement
6. Contract, integration, end-to-end, security, and backup testing
7. VPS deployment and user acceptance

The separate execution plan will decompose this sequence into independently testable tasks with file paths, commands, tests, and checkpoints.

## 20. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Historical Notion cleanup exceeds the build window | Timeline lacks usable records | Build against a small curated representative set; continue backfill independently |
| X permissions or response shapes differ by analytics context | Connector delay | Keep three adapters separate; validate credentials and fixtures first |
| Cost estimates are unavailable or approximate | Admin uncertainty | Label estimates, show operation counts, enforce hard caps |
| LLM chooses an invalid API operation | Failed or unsafe request | Allowlisted typed tools, schema validation, no arbitrary HTTP |
| Prompt injection inside an API skill or source text | Unapproved behavior | Treat instructions as untrusted; enforce operations outside the model |
| Source schema changes | Broken normalization | Quarantine mismatches and retain prior versions |
| Timeline becomes visually crowded | Reduced interpretability | Curator display level, clustering, zoom, and nested activities |
| VPS loss | Loss of historical evidence | Encrypted off-VPS backups and rehearsed restores |
| One-week scope expands | Incomplete release | Hold explicit non-goals and defer later connectors |

## 21. Decision record

- The primary decision is retrospective explanation of growth, not budget planning.
- Notion owns planning, budgets, contribution records, metric definitions, and human curation.
- External APIs own source measurements.
- The dashboard is read-only except for native comments and configuration.
- The curator, not AI, cleans and publishes canonical Notion records.
- The hierarchy is Campaign → Initiative → Timeline Event/Contribution.
- Effort is a factual contribution list rather than hours or points.
- The homepage is a horizontally scrolling historical timeline.
- The original timeline design remains primary; growth analysis is supporting.
- Marker selection opens a drawer with an optional full page.
- Workspace roles are Admin and Member.
- Authentication uses invitation-restricted Google OAuth.
- Sync is manual and admin-only.
- Refresh requires scope and cost preview.
- Connector/model hard caps are editable by admins.
- Metric freeze rules are per connector and default to seven days after the source-object date.
- Notion remains syncable indefinitely.
- Source changes create versions; source deletion archives instead of removing.
- API skills are one instructional document per API family.
- API integrations are read-only.
- OpenRouter is bring-your-own-key with an admin-selectable model and explicit fallback.
- The seeded OpenRouter model identifier is `google/gemma-4-31b-it`.
- Assistant sessions are ephemeral and factual with citations.
- xAI sentiment is one-time unless explicitly re-run.
- V1 has no exports, scheduled polling, native initiative editing, or saved chats.
- Deployment is self-hosted on the current VPS with encrypted off-VPS backups.

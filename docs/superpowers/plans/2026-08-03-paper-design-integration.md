# Paper Design Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the first-build timeline presentation with the approved Paper homepage and initiative drawer while keeping every value authenticated, workspace-scoped, read-only, cited, and sourced from the existing database.

**Architecture:** Extend the existing timeline and initiative-detail queries into explicit server-side read models, then pass serializable data into focused client components for scrolling, zoom, selection, and comments. The approved Paper exports remain visual references; production components consume live database results and connection-specific freshness configuration. Existing routes, auth boundaries, Notion ownership, refresh caps, and source versioning remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Drizzle ORM, PostgreSQL 18, Vitest, Testing Library, Playwright

## Global Constraints

- Use the approved maritime tokens from `docs/design-handoff/tokens.css` and Arimo with a system sans-serif fallback.
- Preserve the left-to-right past → present → future timeline and the alternating history-marker composition.
- Notion and connected APIs remain canonical; imported initiative, budget, effort, and metric data is read-only.
- Comments and replies remain the only editable timeline content.
- Never visually infer causation; retain `Timing alignment supports human interpretation and does not prove causation.`
- Preserve raw versus calculated metric labels, citations, source state, version history, and missing-data gaps.
- Use each metric connection's `freezeAgeDays`; do not hard-code seven days in application presentation.
- Preserve invitation-only authentication, workspace scoping, admin permissions, refresh preflight, spending caps, and audit logging.
- Do not ship Paper placeholder values or static SVG/HTML as the live application.
- Maintain WCAG AA contrast, visible focus states, reduced-motion behavior, and interactive targets of at least 40px.

---

### Task 1: Preserve timeline hierarchy and event metadata

**Files:**
- Modify: `src/db/queries/timeline.ts`
- Modify: `src/lib/timeline/query.ts`
- Modify: `tests/integration/db-schema.test.ts`
- Modify: `tests/unit/timeline-layout.test.ts`

**Interfaces:**
- Produces: `TimelineRow.parentId`, `TimelineRow.kind`, `TimelineRow.status`, `TimelineRow.campaignId`, and `TimelineRow.contributors` for every campaign, initiative, and event.
- Produces: `TimelineLayoutEvent.kind`, `status`, `contributors`, and `parentId` for the visual timeline.
- Parent mapping: campaign → `null`; initiative → `campaignId`; event → `initiativeId`.

- [x] **Step 1: Write the failing integration test**

Extend the existing workspace-scoping test with a published campaign, initiative, and event, then assert:

```ts
expect(rows.map(({ kind, parentId }) => ({ kind, parentId }))).toEqual([
  { kind: "campaign", parentId: null },
  { kind: "initiative", parentId: campaign.id },
  { kind: "activity", parentId: initiative.id },
]);
```

- [x] **Step 2: Run the integration test and verify RED**

Run: `pnpm vitest run tests/integration/db-schema.test.ts`

Expected: FAIL because `TimelineRow` does not expose `parentId` and the event row loses its initiative identity.

- [x] **Step 3: Add hierarchy fields to the database query**

Return `parentId` directly from each query branch and keep the existing workspace, publication, window, and contributor filters intact.

- [x] **Step 4: Write the failing layout metadata test**

Add a unit assertion that `layoutTimelineEvents` preserves `kind`, `status`, and `contributors` while applying expansion and zoom rules.

- [x] **Step 5: Run the layout test and verify RED**

Run: `pnpm vitest run tests/unit/timeline-layout.test.ts`

Expected: FAIL because `getTimelineWindow` currently maps every `parentId` to `null` and drops visual metadata.

- [x] **Step 6: Pass the complete row through the timeline read model**

Extend `TimelineLayoutInput` and map database rows without replacing `parentId`. Keep marker-date and alternating-side calculation inside `layoutTimelineEvents`.

- [x] **Step 7: Verify Task 1**

Run: `pnpm vitest run tests/integration/db-schema.test.ts tests/unit/timeline-layout.test.ts`

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/db/queries/timeline.ts src/lib/timeline/query.ts tests/integration/db-schema.test.ts tests/unit/timeline-layout.test.ts
git commit -m "feat: preserve timeline hierarchy metadata"
```

### Task 2: Build the synchronized growth-series read model

**Files:**
- Create: `src/db/queries/growth-series.ts`
- Create: `src/lib/metrics/growth-series.ts`
- Create: `tests/integration/growth-series.test.ts`
- Create: `tests/unit/growth-series.test.ts`
- Modify: `src/lib/timeline/query.ts`

**Interfaces:**
- Produces: `GrowthSeriesOption { id, name, unit, kind, target }`.
- Produces: `GrowthSeriesPoint { id, periodStart, periodEnd, value, freshness, frozenAt, observedAt, sourceUrl }`.
- Produces: `GrowthSeriesReadModel { definition, points, freezeAgeDays, latestValue, changePercent } | null`.
- Consumes the same `workspaceId`, `start`, and `end` used by `getTimelineWindow` plus an optional selected metric-definition ID.

- [ ] **Step 1: Write the failing workspace/window integration test**

Seed two workspaces and observations inside and outside the requested dates. Assert only published definitions and observations for the requested workspace/window are returned, ordered by `periodStart`.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `pnpm vitest run tests/integration/growth-series.test.ts`

Expected: FAIL because `listGrowthSeries` does not exist.

- [ ] **Step 3: Implement the database query**

Join `metricDefinitions`, `metricObservations`, and the matching `connections` row using workspace, connector key, and connection name. Select `freezeAgeDays` from the connection and filter observations by overlapping period bounds.

- [ ] **Step 4: Write failing calculation tests**

Cover ordered points, an explicit missing-period gap, latest value, percent change from first to latest, a zero baseline returning `null`, and connection-specific freeze days.

- [ ] **Step 5: Run calculation tests and verify RED**

Run: `pnpm vitest run tests/unit/growth-series.test.ts`

Expected: FAIL because `buildGrowthSeriesReadModel` does not exist.

- [ ] **Step 6: Implement the pure growth-series mapper**

Create `buildGrowthSeriesReadModel` without interpolating missing values. Return numeric display values separately from raw database strings and preserve source URL/freshness on every point.

- [ ] **Step 7: Add the growth model to `TimelineReadModel`**

Load selectable published metrics and the chosen series in parallel with timeline rows. Default to the first published definition only when no metric ID is supplied.

- [ ] **Step 8: Verify Task 2**

Run: `pnpm vitest run tests/integration/growth-series.test.ts tests/unit/growth-series.test.ts tests/unit/timeline-layout.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/db/queries/growth-series.ts src/lib/metrics/growth-series.ts src/lib/timeline/query.ts tests/integration/growth-series.test.ts tests/unit/growth-series.test.ts
git commit -m "feat: add synchronized growth series"
```

### Task 3: Assemble drawer evidence, sources, comments, and freshness

**Files:**
- Modify: `src/db/queries/initiative-details.ts`
- Create: `tests/integration/initiative-details.test.ts`
- Modify: `src/components/metrics/MetricCard.tsx`
- Create: `tests/unit/metric-freshness.test.ts`

**Interfaces:**
- Adds `sourceSnapshot`, `connectionFreezeAgeDays`, and grouped contributors to `getInitiativeDetail`.
- Metric presentation consumes `freezeAgeDays` supplied by the read model rather than a constant.
- Existing `CommentThread` remains the live editable collaboration interface.

- [ ] **Step 1: Write the failing initiative-detail integration test**

Seed multiple contributors on one event, a source snapshot/version, raw metric observations, and a matching connection. Assert one contribution row contains all contributor names, source metadata remains cited, and the metric includes the configured freeze window.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `pnpm vitest run tests/integration/initiative-details.test.ts`

Expected: FAIL because contributions are duplicated per person and connection/source metadata is incomplete.

- [ ] **Step 3: Extend and group the initiative read model**

Keep all workspace predicates. Group contributors by event ID in application code, attach cited URLs and versions, and select the matching connection freeze value for each raw metric.

- [ ] **Step 4: Write the failing freshness presentation test**

Assert a metric with `freezeAgeDays: 30` is not presented as frozen at day 8, while one with `freezeAgeDays: 7` is frozen at the same timestamp.

- [ ] **Step 5: Run the freshness test and verify RED**

Run: `pnpm vitest run tests/unit/metric-freshness.test.ts`

Expected: FAIL because `MetricCard` does not consume connection-specific freeze configuration.

- [ ] **Step 6: Implement configurable freshness display**

Pass the read-model freeze value into the freshness helper and render explicit `Raw source`, `Calculated`, `Fresh`, and `Frozen after N days` labels with a citation link.

- [ ] **Step 7: Verify Task 3**

Run: `pnpm vitest run tests/integration/initiative-details.test.ts tests/unit/metric-freshness.test.ts tests/integration/comments.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/db/queries/initiative-details.ts src/components/metrics/MetricCard.tsx tests/integration/initiative-details.test.ts tests/unit/metric-freshness.test.ts
git commit -m "feat: assemble cited initiative evidence"
```

### Task 4: Apply the maritime shell and live filter controls

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/timeline/page.tsx`
- Create: `src/components/timeline/TimelineFilters.tsx`
- Modify: `tests/e2e/timeline.spec.ts`

**Interfaces:**
- `TimelineFilters` receives current query parameters and live campaign/status/contributor options.
- Form submissions preserve date window, selected metric, and zoom.

- [ ] **Step 1: Add failing browser assertions for the approved shell**

Assert the product mark, History navigation state, `Past → present → future`, maritime filter labels, Quarter selection, clear-filters action, and Jump to today button are visible and keyboard reachable.

- [ ] **Step 2: Run the timeline browser test and verify RED**

Run: `pnpm playwright test tests/e2e/timeline.spec.ts --project=chromium`

Expected: FAIL because the existing page uses free-text ID inputs and the old visual shell.

- [ ] **Step 3: Add approved tokens and base typography**

Move the values from `docs/design-handoff/tokens.css` into `src/app/globals.css`, set Arimo/system fallbacks, add visible `:focus-visible` evidence-blue outlines, and respect `prefers-reduced-motion`.

- [ ] **Step 4: Implement the approved dashboard header**

Use the ocean product mark, centered navigation, selected History indicator, workspace/member area, and 40px targets without changing route authorization.

- [ ] **Step 5: Implement live dropdown filters**

Replace ID placeholders with `select` controls populated by workspace-scoped query options. Preserve query parameters and include an explicit Clear link.

- [ ] **Step 6: Verify Task 4**

Run: `pnpm playwright test tests/e2e/timeline.spec.ts --project=chromium && pnpm lint && pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/'(dashboard)'/layout.tsx src/app/'(dashboard)'/timeline/page.tsx src/components/timeline/TimelineFilters.tsx tests/e2e/timeline.spec.ts
git commit -m "feat: apply marketing timeline visual system"
```

### Task 5: Translate the approved history timeline and growth rail

**Files:**
- Modify: `src/components/timeline/HistoryTimeline.tsx`
- Modify: `src/components/timeline/TimelineEvent.tsx`
- Modify: `src/components/timeline/GrowthRail.tsx`
- Create: `src/components/timeline/GrowthChart.tsx`
- Modify: `tests/e2e/timeline.spec.ts`
- Modify: `tests/e2e/acceptance.spec.ts`

**Interfaces:**
- `HistoryTimeline` consumes live events, growth options/series, current window, zoom, and canonical timeline URL.
- `GrowthChart` renders existing observations only; missing periods create visible gaps.

- [ ] **Step 1: Add failing browser assertions for Paper behavior**

Assert campaign bands, alternating event cards, status labels, contributor/source metadata, nested-event expansion, the green Today marker, synchronized growth series, raw/calculated legend, missing-value label, configurable frozen label, and causality disclaimer.

- [ ] **Step 2: Run browser tests and verify RED**

Run: `pnpm playwright test tests/e2e/timeline.spec.ts tests/e2e/acceptance.spec.ts --project=chromium`

Expected: FAIL because the current timeline omits hierarchy metadata and the growth rail is a placeholder.

- [ ] **Step 3: Translate the approved timeline structure**

Use the Paper export as a spacing/composition reference while keeping horizontal scroll width date-driven. Render campaign bands, event kinds, lifecycle states, parent expansion, quarter labels, and future targets from live values.

- [ ] **Step 4: Render the live growth chart**

Use an accessible SVG with observation points, explicit breaks between missing periods, target marker, latest value, percent change, source kind, and the same date scale as the selected timeline window.

- [ ] **Step 5: Preserve viewport behavior**

Keep local and server preference persistence, retain the selected zoom/date/filter query on zoom links, center Today only when no compatible stored viewport exists, and disable smooth motion for reduced-motion users.

- [ ] **Step 6: Verify Task 5**

Run: `pnpm playwright test tests/e2e/timeline.spec.ts tests/e2e/acceptance.spec.ts --project=chromium && pnpm vitest run tests/unit/timeline-layout.test.ts tests/unit/growth-series.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/timeline/HistoryTimeline.tsx src/components/timeline/TimelineEvent.tsx src/components/timeline/GrowthRail.tsx src/components/timeline/GrowthChart.tsx tests/e2e/timeline.spec.ts tests/e2e/acceptance.spec.ts
git commit -m "feat: render live marketing history"
```

### Task 6: Translate the approved initiative drawer

**Files:**
- Modify: `src/components/initiatives/InitiativeDrawer.tsx`
- Modify: `src/components/initiatives/InitiativeDetail.tsx`
- Modify: `src/components/metrics/MetricSeries.tsx`
- Modify: `src/components/comments/CommentThread.tsx`
- Modify: `tests/e2e/initiative-details.spec.ts`
- Modify: `tests/e2e/comments.spec.ts`

**Interfaces:**
- Drawer and full page consume the same `getInitiativeDetail` result.
- Closing the drawer and opening the full page preserve the complete timeline URL.

- [ ] **Step 1: Add failing drawer browser assertions**

Assert the 560px right-side drawer, campaign/status header, overview, dates, owner, planned/actual budget, raw evidence, grouped contribution list, source provenance, team comments, close action, and full-page action.

- [ ] **Step 2: Run drawer tests and verify RED**

Run: `pnpm playwright test tests/e2e/initiative-details.spec.ts tests/e2e/comments.spec.ts --project=chromium`

Expected: FAIL because the current generic detail page is nested inside a wide drawer and does not match the approved evidence hierarchy.

- [ ] **Step 3: Split reusable detail sections**

Keep a shared data contract but render compact drawer and full-page layouts with focused internal sections for summary, performance evidence, contributions, provenance, and comments.

- [ ] **Step 4: Apply dialog accessibility and context preservation**

Label the dialog, set `aria-modal`, provide a visible Close target, retain timeline search parameters, and keep background content visually subdued without making evidence inaccessible on the full page.

- [ ] **Step 5: Verify Task 6**

Run: `pnpm playwright test tests/e2e/initiative-details.spec.ts tests/e2e/comments.spec.ts tests/e2e/acceptance.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/initiatives/InitiativeDrawer.tsx src/components/initiatives/InitiativeDetail.tsx src/components/metrics/MetricSeries.tsx src/components/comments/CommentThread.tsx tests/e2e/initiative-details.spec.ts tests/e2e/comments.spec.ts
git commit -m "feat: add cited initiative drawer"
```

### Task 7: Full verification and publication

**Files:**
- Modify only files required by failures discovered during verification.
- Update: `docs/design-handoff/README.md` if implementation mapping changes.

**Interfaces:**
- Produces a mergeable PR from `codex/design-handoff` to `main` with no credentials or static placeholder data in production code.

- [ ] **Step 1: Start and migrate the disposable test database**

Run:

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml exec postgres-test pg_isready -U marketing_test -d marketing_test
pnpm db:migrate
```

- [ ] **Step 2: Run the complete validation chain**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`

Expected: all unit, integration, contract, and browser tests pass; lint, type checking, and production build exit zero.

- [ ] **Step 3: Inspect scope and secrets**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
git ls-files '.env*'
git diff --name-status origin/main...HEAD
```

Expected: no whitespace errors, no uncommitted application changes, and no production environment file tracked.

- [ ] **Step 4: Visually compare the live browser to the Paper exports**

Capture the timeline with and without an open drawer at 1440px. Compare hierarchy, gutters, colors, type scale, timeline axis, growth rail, drawer width, focus states, and empty/error states against `docs/design-handoff/assets/desktop-homepage.png` and `initiative-drawer.png`.

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin codex/design-handoff
gh pr create --base main --head codex/design-handoff --title "Integrate approved marketing timeline design" --body "Translates the approved Paper homepage and initiative drawer into authenticated, workspace-scoped live components. Adds timeline hierarchy, synchronized growth metrics, cited evidence, configurable freshness, and full browser coverage."
```

- [ ] **Step 6: Verify PR state**

Run: `gh pr view --json url,state,isDraft,mergeable,mergeStateStatus,statusCheckRollup`

Expected: open, mergeable PR with the local validation results recorded in the handoff.

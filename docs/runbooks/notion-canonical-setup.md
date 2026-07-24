# Canonical Notion setup

## Purpose

Create one `Marketing HQ` page with linked views of five canonical databases.
The dashboard reads these databases and never writes back to Notion. Existing
historical pages remain evidence and should be linked through source fields
instead of moved or deleted.

All relation fields must use explicit Notion relations. The importer never
infers a Campaign or Initiative relationship from prose.

## Shared values

`Publication Status` is a Notion Status property with exactly:

- `Draft`
- `Ready for Review`
- `Published`

Only `Published` records enter the dashboard. `Display Level` is a Select with:

- `Primary marker`
- `Nested activity`
- `Detail only`

## 1. Campaigns

| Property | Notion type |
|---|---|
| Campaign | Title |
| Lifecycle Status | Status |
| Publication Status | Status |
| Start Date | Date |
| End Date | Date |
| Owner | Person |
| Objective | Rich text |
| Initiatives | Relation → Initiatives |
| Source Records | Rich text containing full URLs |
| Display Level | Select |

Campaign budget is a roll-up of initiative budgets; do not enter it twice.

## 2. Initiatives

| Property | Notion type |
|---|---|
| Initiative | Title |
| Campaign | Relation → Campaigns |
| Lifecycle Status | Status |
| Publication Status | Status |
| Start Date | Date |
| End Date | Date |
| Owner | Person |
| Planned Budget | Number |
| Actual Spend | Number |
| Overview | Rich text |
| Events & Contributions | Relation → Timeline Events & Contributions |
| Metrics | Relation → Metric Definitions |
| Attribution Template | Select |
| Source Records | Rich text containing full URLs |
| Display Level | Select |

Budget values use the dashboard workspace base currency.

## 3. Timeline Events & Contributions

| Property | Notion type |
|---|---|
| Event / Work Performed | Title |
| Initiative | Relation → Initiatives |
| Event Type | Select: Activity, Post, Milestone, Launch, Outcome, Other |
| Publication Status | Status |
| Start Date | Date |
| End Date | Date |
| Contributors | People |
| Context | Rich text |
| External Object URLs | Rich text containing full URLs |
| Source Records | Rich text containing full URLs |
| Display Level | Select |

The website displays each contribution as `Work performed | Contributor(s)`.

## 4. Metric Definitions

| Property | Notion type |
|---|---|
| Metric | Title |
| Metric Type | Select: Raw source, Calculated |
| Connector Type | Select: Notion, X Post, X Account, X Ads |
| Named Connection | Rich text |
| External Metric Key | Rich text |
| Unit | Select |
| Aggregation | Select |
| Target | Number |
| Related Campaigns | Relation → Campaigns |
| Related Initiatives | Relation → Initiatives |
| Attribution Template | Select |
| Override Window Days | Number |
| Formula | Select |
| Formula Inputs | Relation → Metric Definitions |
| Publication Status | Status |

Credentials never belong in Notion.

## 5. Manual Metric Observations

| Property | Notion type |
|---|---|
| Observation | Title |
| Metric | Relation → Metric Definitions |
| Initiative | Optional relation → Initiatives |
| Period Start | Date |
| Period End | Date |
| Value | Number |
| Unit | Rich text |
| Source Reference | URL |
| Notes | Rich text |
| Publication Status | Status |

Store unformatted numbers (`523100`, not `523.1K`).

## Complete example

1. Campaign: `Token Sales`, Published, 2026-07-01 through 2026-07-31.
2. Initiative: `Token Pre-Sales`, related to `Token Sales`, planned budget
   `10000`, actual spend `9200`.
3. Event: `Token Pre-Sales social posting`, related to `Token Pre-Sales`,
   contributor `Person A`, Event Type `Post`.
4. Metric: `X post impressions`, Raw source, Connector Type `X Post`, Named
   Connection `Main X Account`, External Metric Key `public_metrics.impression_count`.
5. Observation: `Pre-sales launch impressions`, related to the metric and
   initiative, period 2026-07-01 through 2026-07-07, numeric value and original
   report URL.

Move each record through `Draft → Ready for Review → Published`. After
publishing, an admin runs a manual Notion sync and reviews the validation
report. Correct invalid records in Notion; do not patch imported values in the
dashboard.

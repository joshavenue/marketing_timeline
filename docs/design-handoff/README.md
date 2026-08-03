# Marketing Timeline design handoff

Paper source: https://app.paper.design/file/01KZ38RHXGH1H8V4P7GFQJQD42/1-0

## Included

- `desktop-homepage.html` — standalone HTML preview of the approved homepage.
- `initiative-drawer.html` — standalone HTML preview with the selected initiative drawer open.
- `desktop-homepage.paper.jsx` — Paper's static JSX structure and computed inline styles.
- `initiative-drawer.paper.jsx` — Paper's static JSX structure for the overlay and drawer state.
- `tokens.css` — the approved Paper design tokens.
- `assets/desktop-homepage.svg` and `assets/initiative-drawer.svg` — lossless vector exports.
- `assets/desktop-homepage.png` and `assets/initiative-drawer.png` — visual review references.
- `assets/brand-kit.png` and `assets/brand-kit.pdf` — complete brand-kit exports.

The HTML previews render the lossless SVG exports, while the JSX files preserve Paper's implementation structure and computed styles. They are intentionally static. Translate them into the existing Next.js components and live data contracts rather than shipping the placeholder content directly.

## Backend alignment

The approved interface maps to the existing architecture:

- Timeline bands and events: `campaigns`, `initiatives`, `timeline_events`, publication status, display level, lifecycle status, dates, and contributors.
- Initiative drawer: `getInitiativeDetail`, budgets, owner, contributions, metrics, source URLs, versions, and comments.
- Growth context: `metric_definitions` and `metric_observations`, with raw/calculated and freshness states kept explicit.
- Evidence provenance: source snapshots, source state, citations, and version tables.
- Refresh safety: manual refresh jobs, admin preflight, spending caps, configurable freeze windows, and audit events.
- Canonical editing: Notion remains the source of truth; imported source data stays read-only in the dashboard.

## Required integration work

1. Preserve initiative/event parent IDs through the timeline read model so nested events and expansion work.
2. Replace the current growth-rail placeholder with a metric-series query sharing the timeline date window and scale.
3. Assemble comments, citations, freshness, and source version data into the drawer read model.
4. Wire the final dropdown filters, remembered zoom/position, horizontal scrolling, and Jump to today behavior.
5. Make all freshness presentation honor the connection-specific freeze configuration rather than a hard-coded seven-day helper.
6. Replace all design placeholder values with data returned by authenticated, workspace-scoped queries.

## Safety and provenance

- Production baseline: `9f48c5c005d1689f3d26c51b6e3fa24e2480927e`.
- No VPS production credentials or secrets are included.
- The Paper brand kit and design remain the visual source of truth.

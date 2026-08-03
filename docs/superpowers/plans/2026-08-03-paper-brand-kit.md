# Marketing Timeline Paper Brand Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and quality-check a reusable Marketing Timeline brand-kit artboard in Paper without changing the three Customer.io reference artboards.

**Architecture:** The deliverable is a single 1440px Paper artboard assembled from small, reviewable visual groups. File-level tokens establish the foundation; subsequent sections consume those tokens for typography, controls, timeline specimens, metric treatments, and system states. Screenshots at every section boundary provide the visual test cycle.

**Tech Stack:** Paper Desktop, Paper MCP, HTML/CSS design nodes, Paper design tokens, Arimo typography

## Global Constraints

- Preserve all three Customer.io reference artboards unchanged.
- Create one separate artboard named `Marketing Timeline — Brand Kit`.
- Use the approved maritime palette: canvas `#FFFFFF`, ocean `#062F33`, ink `#151718`, fog `#E9EEF0`, signal `#C7F36B`, evidence `#315CDD`.
- Use Arimo only after confirming the available weights through `get_font_family_info`.
- Use `px` for font sizes and line heights and `em` for letter spacing.
- Use realistic Marketing Timeline content; do not use generic placeholder labels.
- Add roughly one visual group per `write_html` call.
- Review spacing, typography, contrast, alignment, artboard fit, and repetition after every completed section.
- If content clips, set the artboard height to `fit-content`; do not guess another fixed height.
- Use color together with labels, icons, or line styles; never use color as the only status signal.
- Call `finish_working_on_nodes` after the final accepted refinement.

---

## File and artifact structure

- Create in Paper: `Marketing Timeline — Brand Kit` artboard — owns all brand-kit sections and specimens.
- Modify in Paper: file design tokens — shared color, type, spacing, radius, container, and breakpoint foundations.
- Preserve in Paper: the three Customer.io artboards — visual references only.
- Track in Git: this implementation plan and the approved brand-kit specification only; Paper canvas data is managed by Paper.

### Task 1: Establish the artboard and token foundation

**Artifacts:**
- Create: Paper artboard `Marketing Timeline — Brand Kit`
- Modify: Paper file design tokens

**Interfaces:**
- Produces: approved `--color-*`, `--font-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--spacing-*`, `--radius-*`, `--container-*`, and `--breakpoint-*` variables consumed by every later task.

- [ ] **Step 1: Confirm the font family**

Call `get_font_family_info` with `familyNames: ["Arimo"]`. Require regular 400, medium or semibold 500/600, and bold 700. If 500 is unavailable, use 600 for interface emphasis.

- [ ] **Step 2: Create the complete token set**

Call `create_tokens` with these minimum tokens:

```text
--font-sans: Arimo
--color-canvas: #FFFFFF
--color-ocean: #062F33
--color-ink: #151718
--color-fog: #E9EEF0
--color-signal: #C7F36B
--color-evidence: #315CDD
--color-muted: #657073
--color-success: #2E7D6B
--color-warning: #A96F12
--color-error: #B5413E
--breakpoint-desktop: 1440px
--container-content: 1344px
--text-display: 56px
--text-page: 40px
--text-section: 28px
--text-card: 18px
--text-body: 16px
--text-interface: 14px
--text-caption: 13px
--font-weight-regular: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--tracking-display: -0.035em
--tracking-label: 0.08em
--leading-display: 60px
--leading-page: 44px
--leading-section: 34px
--leading-card: 24px
--leading-body: 24px
--leading-interface: 20px
--leading-caption: 18px
--spacing-1: 4px
--spacing-2: 8px
--spacing-3: 12px
--spacing-4: 16px
--spacing-6: 24px
--spacing-8: 32px
--spacing-12: 48px
--spacing-16: 64px
--spacing-24: 96px
--radius-control: 999px
--radius-card: 12px
--radius-panel: 16px
```

- [ ] **Step 3: Create the new artboard**

Call `create_artboard` with name `Marketing Timeline — Brand Kit` and styles:

```json
{
  "display": "flex",
  "flexDirection": "column",
  "width": "1440px",
  "height": "2400px",
  "backgroundColor": "var(--color-canvas)",
  "color": "var(--color-ink)",
  "fontFamily": "var(--font-sans)",
  "padding": "64px 48px",
  "gap": "96px"
}
```

- [ ] **Step 4: Add the brand-kit title group**

Use separate `write_html` calls for the eyebrow, `Marketing Timeline` display title, and maritime direction statement. Include `Brand system · v1.0 · August 2026` as the caption.

- [ ] **Step 5: Review the foundation checkpoint**

Capture the artboard with `get_screenshot(scale: 1)`. Verify the title is readable, the 48px gutters are visible, no Customer.io artboard changed, and the first section has deliberate vertical rhythm. Apply targeted fixes before Task 2.

### Task 2: Build color, typography, spacing, and surface foundations

**Artifacts:**
- Modify: `Marketing Timeline — Brand Kit`

**Interfaces:**
- Consumes: all tokens from Task 1.
- Produces: visual reference specimens used to judge later components.

- [ ] **Step 1: Add the color section heading and usage statement**

Create one heading group labeled `01 — Color / Navigation chart` with a short statement that signal green marks focus and present time while evidence blue marks cited source facts.

- [ ] **Step 2: Add six primary color specimens**

Create one swatch group per call for Canvas, Ocean, Ink, Fog, Signal, and Evidence. Each specimen includes token name, hex value, and one-sentence role.

- [ ] **Step 3: Add accessibility pairings**

Create compact pairings for ink on canvas, canvas on ocean, ink on signal, evidence on canvas, and canvas on evidence. Show `AA` as a textual badge rather than relying on color.

- [ ] **Step 4: Add the typography scale**

Create one group each for Display, Page title, Section title, Card title, Body, Interface, and Caption. Use realistic copy such as `Marketing history`, `Token presale campaign`, and `Source updated 3 Aug 2026`.

- [ ] **Step 5: Add spacing, radius, border, and elevation specimens**

Show the approved spacing scale, 12px event-card radius, 16px panel radius, pill control radius, fog border, and one drawer-only shadow.

- [ ] **Step 6: Review the foundation specimens**

Capture the artboard. Check that swatches and type rows align, small labels remain legible, signal green is visually scarce, and the section does not become a uniform card grid. Fix issues before Task 3.

### Task 3: Build controls, navigation, and status language

**Artifacts:**
- Modify: `Marketing Timeline — Brand Kit`

**Interfaces:**
- Consumes: tokens and foundation specimens from Tasks 1–2.
- Produces: control and state patterns for the homepage and initiative drawer.

- [ ] **Step 1: Add a product navigation specimen**

Create a compact header with the `Marketing Timeline` wordmark, History selected, and Analytics, Notifications, and Settings inactive. Use ocean for the brand mark and a signal-green selected indicator.

- [ ] **Step 2: Add button states**

Create primary `Open evidence`, secondary `Jump to today`, ghost `Clear filters`, and icon-only navigation controls. Show default, hover, focus, and disabled specimens with at least 40px height.

- [ ] **Step 3: Add filter controls**

Create Search, Campaign, Status, Contributor, date-range, and Year/Quarter/Month/Week segmented controls. Repeated controls must use consistent heights and label lanes.

- [ ] **Step 4: Add status badges**

Create labeled specimens for Planned, Active, Completed, Paused, Draft, Published, Raw source, Calculated, Frozen, and Disconnected.

- [ ] **Step 5: Review controls and states**

Capture the section. Trace horizontal alignment through every control, verify focus states are visible, and confirm badges remain distinguishable without color. Apply targeted fixes before Task 4.

### Task 4: Build timeline and growth-analysis specimens

**Artifacts:**
- Modify: `Marketing Timeline — Brand Kit`

**Interfaces:**
- Consumes: status, control, color, and typography patterns.
- Produces: the visual grammar for the future homepage timeline.

- [ ] **Step 1: Add the historical axis specimen**

Create a horizontal ink axis with 2025, Q1 2026, Q2 2026, `Today`, and Q4 2026 labels. Use signal green only for the today marker.

- [ ] **Step 2: Add timeline marker families**

Create distinct labeled markers for Campaign, Initiative, Milestone, Activity, and Contribution. Use shape, size, and label—not color alone—to distinguish hierarchy.

- [ ] **Step 3: Add event cards and cluster behavior**

Create completed `Token presale launch`, active `Weekly growth reporting`, future `Partner activation`, and a `+3 events` cluster. Include dates, status, contributor count, and source availability.

- [ ] **Step 4: Add the growth-rail specimen**

Create a synchronized line specimen for `Follower count` with raw observations in evidence blue, one calculated comparison in a dashed ocean line, a target marker, a missing-data gap, and a frozen-data annotation.

- [ ] **Step 5: Add the causality disclaimer**

Add the exact supporting copy: `Timing alignment supports human interpretation and does not prove causation.`

- [ ] **Step 6: Review timeline and metric language**

Capture the section. Verify chronological direction reads immediately, marker hierarchy survives grayscale interpretation, labels do not collide, and raw versus calculated data remains unmistakable. Fix before Task 5.

### Task 5: Build evidence, drawer, collaboration, and system-state specimens

**Artifacts:**
- Modify: `Marketing Timeline — Brand Kit`

**Interfaces:**
- Consumes: all prior brand patterns.
- Produces: secondary interface patterns needed after timeline selection.

- [ ] **Step 1: Add source and freshness patterns**

Create `Notion source`, `Last read 3 Aug 2026`, `Frozen after 7 days`, and `Source changed` rows with fixed icon, label, metadata, and action slots.

- [ ] **Step 2: Add initiative summary and drawer header**

Create an initiative summary for `Token Presales` with campaign, status, date range, planned budget, actual spend, owner, `Close`, and `Open full page` actions.

- [ ] **Step 3: Add contribution and comment patterns**

Create `Token presales social posting | Person A` and `Marketing collateral | Person A, Person B`, followed by one comment, one reply, and one @mention notification.

- [ ] **Step 4: Add system states**

Create compact specimens for loading, no published events, no metric observations, Notion validation warning, disconnected connector, and spending-cap blocked refresh.

- [ ] **Step 5: Review secondary patterns**

Capture the section. Check vertical lanes, source-action alignment, comment hierarchy, warning contrast, and whether system states remain calm rather than alarming. Apply targeted fixes.

### Task 6: Final visual QA and handoff

**Artifacts:**
- Modify: `Marketing Timeline — Brand Kit`
- Preserve: all Customer.io reference artboards

**Interfaces:**
- Consumes: the complete brand-kit artboard.
- Produces: a finished, user-reviewable Paper brand kit ready to guide homepage design.

- [ ] **Step 1: Fit the complete artboard**

If any content clips, call `update_styles` on the brand-kit artboard with `height: "fit-content"`. Do not change its 1440px width or 48px horizontal gutters.

- [ ] **Step 2: Capture the full artboard**

Call `get_screenshot(scale: 1)` and evaluate spacing, typography, contrast, alignment, fit, and repetition in one complete view.

- [ ] **Step 3: Make targeted final refinements**

Adjust only the groups that fail the review. Preserve accepted work and do not delete and recreate the entire artboard for a local issue.

- [ ] **Step 4: Verify reference preservation**

Call `get_basic_info` and confirm the file contains the original three Customer.io artboards plus the new `Marketing Timeline — Brand Kit` artboard.

- [ ] **Step 5: Release the working state**

Call `finish_working_on_nodes` for the brand-kit artboard after the final screenshot passes.

- [ ] **Step 6: Present the result for user review**

Report that the brand kit is complete, summarize its sections, and ask the user to review it in Paper before any homepage artboard is created.

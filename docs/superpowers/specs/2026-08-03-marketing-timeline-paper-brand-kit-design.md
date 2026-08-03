# Marketing Timeline — Paper Brand Kit Design

**Status:** Approved direction, pending written-spec review  
**Date:** 2026-08-03  
**Scope:** Brand foundations for the desktop Marketing Timeline interface

## 1. Purpose

This brand kit establishes the visual system for the Marketing Timeline Dashboard before individual screens are designed. It translates the approved product principles—history first, evidence over opinion, progressive detail, and cost-conscious data access—into reusable color, typography, spacing, shape, icon, and data-visualization rules.

The kit will be created as a new Paper artboard. The three Customer.io artboards on Page 1 remain unchanged and serve only as references for restraint, editorial hierarchy, whitespace, and polished information presentation.

## 2. Visual direction

The chosen mood is **maritime**. The interface should feel like a precise navigation chart: calm, spacious, trustworthy, and capable of revealing dense historical evidence without becoming visually noisy.

This direction deliberately avoids a conventional card-heavy SaaS dashboard. Information should live directly on clear surfaces, with borders and tonal shifts used to establish structure. Signal colors appear only when they communicate status, selection, evidence, or temporal position.

## 3. Color system

The palette is derived from a maritime scene: open paper charts, deep ocean water, dark instrument ink, coastal fog, navigation markers, and blue evidence annotations.

| Token | Value | Role |
|---|---:|---|
| `--color-canvas` | `#FFFFFF` | Primary page and artboard ground |
| `--color-ocean` | `#062F33` | Navigation, strong surfaces, primary dark brand color |
| `--color-ink` | `#151718` | Primary text, timeline axis, high-contrast controls |
| `--color-fog` | `#E9EEF0` | Dividers, secondary surfaces, inactive controls |
| `--color-signal` | `#C7F36B` | Active state, present-time signal, primary action accent |
| `--color-evidence` | `#315CDD` | Source links, citations, raw-data indicators |

Supporting semantic colors are derived conservatively from this system:

- Success and completed states use a desaturated sea green.
- Warning and planned states use a muted amber suitable for small labels.
- Error and disconnected states use a restrained red reserved for actionable problems.
- Muted text remains neutral and must maintain readable contrast at small sizes.

Large tinted backgrounds and decorative gradients are excluded. The signal green is used sparingly so it remains meaningful.

## 4. Typography

The primary family is **Arimo**, subject to confirming its available Paper weights before styling. It aligns with the reference artboards while remaining practical for dense interface data.

| Style | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| Display | 56px | 600 | 60px | Homepage title or defining statement |
| Page title | 40px | 600 | 44px | Screen-level headings |
| Section title | 28px | 600 | 34px | Major content regions |
| Card title | 18px | 600 | 24px | Initiative and metric headings |
| Body | 16px | 400 | 24px | Descriptions and explanatory text |
| Interface | 14px | 500 | 20px | Controls, navigation, timeline labels |
| Caption | 13px | 400–600 | 18px | Dates, citations, metadata, status labels |

Large headings use slightly tight tracking. Small uppercase labels use restrained open tracking. Text below 13px is excluded from the standard system.

## 5. Spacing and layout

The spacing scale uses `4, 8, 12, 16, 24, 32, 48, 64, 96` pixels.

- Desktop designs use a 1440px artboard and a 12-column content grid.
- Primary page gutters are 48px at desktop width.
- Related controls use 8–12px gaps.
- Content groups use 24–32px gaps.
- Major sections use 64–96px separation.
- Timeline event lanes and repeated metadata rows use fixed-width slots to maintain alignment.

Whitespace should clarify chronology and hierarchy. Empty space is intentional and should not be filled with decorative cards.

## 6. Shape and surface language

- Primary panels use 16px corner radii.
- Compact controls and chips use full pill radii.
- Event cards use 12px radii so they remain structured rather than soft or playful.
- Borders use the fog token or low-opacity ink.
- Shadows are reserved for overlays, drawers, and actively elevated timeline events.
- Default surfaces are flat; nested cards inside cards are avoided.

## 7. Core component specimens

The Paper brand-kit artboard will include reusable visual specimens for:

1. Wordmark and compact product mark.
2. Primary and secondary navigation treatments.
3. Primary, secondary, ghost, and icon buttons.
4. Search, select, date, segmented zoom, and filter controls.
5. Lifecycle, publication, source-state, and raw/calculated data badges.
6. Campaign, initiative, milestone, activity, and contribution timeline markers.
7. Timeline axis, today marker, time labels, cluster treatment, and dependency line.
8. Raw metric, calculated metric, target, gap, and frozen-data treatments.
9. Source citation, freshness, and external-evidence link patterns.
10. Initiative summary card and right-side drawer header.
11. Comment, mention, and notification states.
12. Empty, loading, validation-warning, disconnected, and no-data states.

Specimens should use realistic Marketing Timeline content rather than generic placeholder labels.

## 8. Data-visualization rules

- The historical axis remains ink-colored and visually dominant.
- Company-growth series use ocean as the primary line color.
- Signal green marks today, active selection, or a highlighted comparison point—not every positive value.
- Evidence blue identifies raw source observations and citations.
- Calculated attribution uses a distinct line style and explicit `Calculated` label.
- Missing periods display gaps; values are never visually interpolated as facts.
- Future initiatives show plans and targets without result styling.
- Temporal alignment is labeled as context and never presented as proof of causation.

## 9. Accessibility and behavior

- Body and interface text must meet WCAG AA contrast against their surfaces.
- Color is never the only status indicator; labels, icons, or line styles reinforce meaning.
- Focus states use a visible evidence-blue outline with sufficient offset.
- Interactive targets are at least 40px high in the desktop interface.
- Hover, selected, active, disabled, loading, and error states are represented in the kit.
- Motion guidance favors short positional or opacity transitions and respects reduced-motion preferences.

## 10. Paper deliverable and review gate

The first Paper deliverable is one separate **Marketing Timeline — Brand Kit** artboard containing:

- Brand foundation and mood statement
- Color tokens and accessibility pairings
- Typography scale
- Spacing, radii, borders, and elevation
- Core control specimens
- Timeline and metric visualization specimens
- Status, source, and system-state specimens

The artboard will be reviewed at meaningful checkpoints for spacing, typography, contrast, alignment, artboard fit, and excessive repetition. The homepage design begins only after this brand kit is reviewed and accepted.


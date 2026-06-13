# Raster v2 — UI Redesign + Features + Motion

**Date:** 2026-06-13 · **Branch:** `feature/raster-v2-ui`

Redesign Raster to match the "Swiss Grid Studio" reference: a polished white control
sidebar + grey canvas stage, a numbered layout grid, real shuffle randomization,
in-place editing, style/typography controls, and rich GSAP motion.

## Decisions (confirmed)
- ~19 named numbered layouts (Prev/Next + "Layout N — Name" bottom bar).
- Full in-place editing (click poster text to edit where it sits; click/drop image on frame).
- Rich & showy motion (signature poster re-flow on shuffle/layout change + load stagger + hover/press + animated grain), GSAP, respects `prefers-reduced-motion`.
- App name stays **Raster**.

## Data model additions (`src/types.ts`)
- `Format` adds `'3:4'` and `'A4'` → FORMATS `{ '3:4':1080×1440, 'A4':1080×1527 }` (keep existing).
- `Typography { typeface: FontFamily; title: number; headline: number; body: number; tracking: number; leading: number }`.
- `StyleOptions { accentHeadline; bwImage; filmGrain; gridOverlay: boolean }`.
- `Slot` gains optional `typeClass?: 'title' | 'headline' | 'body'`.
- `Design` gains `typography: Typography`, `style: StyleOptions`, `layout: number`.

### Type class mapping (computed in build from role)
`headline → title`; `date, glyph → headline`; everything else (`subhead, caption, index, mark`) → `body`. Global typography sets size per class (overrides the per-slot base size); `tracking`/`leading`/`typeface` apply to title+headline classes only.

### Defaults
- Typography: `{ typeface:'display', title:120, headline:220, body:18, tracking:-0.02, leading:0.92 }`.
- Style: `{ accentHeadline:false, bwImage:true, filmGrain:true, gridOverlay:false }`.

## Layouts (`src/design/layouts.ts`)
`LAYOUTS: { n:number; name:string; archetype:string; variant:number }[]` — 19 entries mapping the 12 archetypes (and their strong variants) to numbered, named layouts (e.g. `1 — Classic`, `2 — Index`, `3 — Mega`, `4 — Diptych`…). `buildFromLayout(n, format)` builds a Design with that archetype+variant and default typography/style.

## Real shuffle + surprise (`src/design/shuffle.ts`, store)
- **Shuffle** (`reShuffle`): meaningful randomization of the CURRENT layout using `Math.random` fresh seed — pick a random variant, then apply always-valid seeded transforms: horizontal mirror (flip cells `c → cols−c−cs` and flip text align), and small vertical row jitter (±1–2 rows where headroom exists). Preserves content/palette/typography/style/format. Yields many distinct on-grid compositions.
- **Surprise**: randomize everything — random layout (archetype+variant), random preset palette, random style toggles, keep content.

## Renderer effects (`src/render/*`)
- **Typography by class**: SlotText effective size = `typography[classOf]`; title/headline use `typography.tracking/leading/typeface`.
- **B&W image**: SVG `<filter feColorMatrix saturate=0>` on images when `style.bwImage`.
- **Accent headline**: title-class headline rendered in `palette.accent` when `style.accentHeadline`.
- **Grid overlay**: faint column/row lines when `style.gridOverlay`.
- **Film grain**: overlay `<rect>` with `feTurbulence` fractal noise, soft-light blend, low opacity, when `style.filmGrain`; animate `seed` (SMIL/GSAP) for live grain.
- All effects participate in SVG export (grain/grid optionally baked).

## UI redesign (`src/ui/*`)
White sidebar (scrollable) + grey canvas stage with centered, shadowed poster. Sidebar sections, each an uppercase micro-label + control group:
- **Header** — "Raster" + tagline "Typography · Grids · Foundation · Design".
- **LAYOUT** — grid of 19 numbered cells (selected = black, hover lift); **Shuffle ⇄** + **Surprise ✦** buttons.
- **CANVAS** — format chips `3:4 · A4 · 4:5 · 1:1` (+ others).
- **CONTENT** — a labeled field per text slot (TITLE, HEADLINE, META A/B, FOOTER, LOGO NAME…) + **Upload image** + tip text.
- **TYPOGRAPHY** — typeface select + sliders Title / Headline / Body / Tracking / Leading.
- **STYLE** — preset palette swatches, accent colour picker, checkboxes (Accent the headline · B&W image · Film grain · Show grid overlay).
- **EXPORT** — PNG / JPG / SVG.
- **Bottom bar** — "Layout N — Name" + Prev / Next.

## In-place editing (`src/ui/EditOverlay.tsx`)
HTML overlay aligned to the SVG (reuse CanvasStage scale). Click a text slot → a textarea positioned over its box, styled to match (family/size/color/align), edits `setContent`, commits on blur. Image slot region = click-to-upload + drag-drop zone (→ dataURL). Keep existing Free drag mode behind the mode toggle.

## Motion (GSAP — `src/ui/motion/*`)
- **Load**: stagger sidebar sections (y+opacity, 40ms, ease-out `cubic-bezier(0.23,1,0.32,1)`); poster scale-in from 0.96.
- **Signature re-flow**: on `layout`/`seed` change, wrap each slot in a `<g data-slot>` and `gsap.from` stagger them into place (y offset + opacity + slight scale + blur), ~28–40ms stagger, <500ms total. The hero moment.
- **Format change**: tween the stage container aspect.
- **Buttons/cells**: `:active` scale 0.97; layout-cell hover lift via distance-aware GSAP.
- **Grain**: animate `feTurbulence` seed.
- Guard everything behind `prefers-reduced-motion` (keep fades, drop movement).

## localStorage migration
`load()` merges persisted Design with v2 defaults (old saves lack `typography/style/layout/typeClass`) so existing autosaves don't crash.

## Security considerations
No new external surface. Pasted image URLs / uploads still rendered as `<image>` only; user text still flows into SVG `<text>` (React-escaped, no `dangerouslySetInnerHTML`). CSP unchanged. Low-risk, client-only.

## Out of scope (v2)
Per-slot independent typography (global classes replace it), multi-page, collaboration, server persistence.

# Poster Forge — Design Spec

**Date:** 2026-06-13
**Status:** Approved (brainstorm), pending implementation plan
**Working name:** `poster-forge` (rename freely)

## Summary

A quick, client-side **auto-designer** for Swiss-editorial / brutalist / neo-brutalist
grid posters. You drop in text and images, pick a layout archetype, and the tool
arranges it on a column grid in that aesthetic. A **shuffle** button re-flows the
content into many on-grid variations ("heaps of layouts" fast). You can switch canvas
formats and export the result. Make-and-done: no backend, no database, no auth.

## Goals

- Produce on-aesthetic grid posters in seconds from your own text + images.
- Generate many distinct variations of the same content via shuffle.
- Support multiple canvas formats from one design.
- Export crisp **PNG/JPG** (for posting) and **SVG** (for editing in Figma/Illustrator).
- Stay ruthlessly simple: a static site you open, make, export, close.

## Non-goals (YAGNI)

No database, no auth, no cloud sync, no project library, no stock-photo search, no
reusable asset-library panel, no PDF export, no multi-page documents, no collaboration.
All addable later; none in scope now.

## Stack & shape

- **React 18 + Vite + Tailwind + shadcn/ui.** Pure client-side SPA.
- **Deployed as a static build on Vercel.** No backend, no DB, no auth, no network
  calls except loading the app and self-hosted fonts.
- **Images:** upload (drag/drop or file pick, held in-app as object URLs / base64) and
  paste-an-image-URL. Nothing is uploaded to a server.
- **Persistence:** `localStorage` autosave of the *current working design only*, so a
  page refresh does not lose work. This is the entire persistence story — not a
  database, not a saved-project library. (Trivially removable if undesired.)

## Rendering architecture (the core decision)

A poster is a **data model** (`Design`) of slots with computed geometry, **rendered as a
real SVG document** — not HTML/CSS. Each slot resolves to an exact `x/y/width/height`
box on the grid and is drawn as SVG `<text>`, `<image>`, or `<rect>`.

Rationale:
- **One source of truth → both exports native and crisp.** SVG export = serialize the
  document. PNG/JPG export = rasterize that same SVG at 2–4× DPI. No html-to-canvas
  font/spacing drift between preview and export.
- SVG suits a grid engine: slots already resolve to explicit rectangles.

Trade-offs / wrinkles:
- SVG has no flexbox, so the **grid engine computes positions itself** (needed for
  shuffle regardless).
- **Fonts are embedded** into the SVG on export so the file opens correctly in
  Figma/Illustrator (base64-embed the used font subsets, or convert text to outlines as
  an option).
- Text auto-fit (clamp font size to its box) is computed against measured glyph metrics.

## Layout engine

- **Column grid:** a configurable column count (e.g. 6 / 12) plus baseline rows. The
  grid re-proportions per canvas format.
- **Archetypes = slot skeletons.** Each archetype maps named slots (headline,
  date-block, image, caption, footer-mark, index-list, glyph, etc.) onto grid regions,
  with rules for which slots are required/optional and how they may move/scale.
- **Content fills slots.** Text auto-fits within its box; the user can override.
- **Shuffle = constrained re-flow.** Re-assigns slots to alternate valid grid positions
  and scales within the archetype's rule set, producing many on-grid variations from the
  same content. Deterministic per seed so a good shuffle can be returned to.
- **Format switch:** 4:5, 2:3 (portrait poster), 9:16 (story), 1:1 (square), 16:9
  (wide). Each archetype carries adaptation rules so it stays composed in every shape.
- **Two edit modes:**
  - *Grid mode* (default): everything snaps to the grid; shuffle works; hard to make it
    look bad.
  - *Free-canvas mode*: detach a slot to drag / resize / nudge freely (snap optional).

## Starter archetype set (12)

Extracted from the reference posters plus the broader vocabulary:

| ID | Name | Essence |
|----|------|---------|
| A | Editorial Grid | Multi-zone: headline + framed photo + giant date + footer captions |
| B | Headline + List | Title/date stack, dense city/index list, image block |
| C | Mega Word | Full-bleed photo, one giant centered word, tiny subhead + mark |
| D | Full-bleed + Corners | Edge-to-edge image, corner caption columns, headline in a corner |
| E | Glyph + Frame | Light ground, oversized glyph/word, framed illustration, sparse labels |
| F | Grid-overlay + Figure | Visible modular grid, cut-out figure, mega type overlapping |
| G | All-Type | No photo; giant stacked words fill the canvas, rules + tiny meta |
| H | Split Diptych | Hard 50/50 divide — image one half, type the other |
| I | Index / Contents | Magazine contents: numbered rows, page refs, small thumbs |
| J | Number Feature | One colossal numeral/date owns the page, slim framing text |
| K | Modular Bento | Contact-sheet grid of image + color cells, type woven between |
| L | Sidebar Rail | Narrow metadata rail left, big headline + image field right |

## Typography

- **Curated grotesques**, self-hosted (no external font CDN at runtime if avoidable):
  an Inter/Helvetica-Now-style sans, a Neue-Haas/Archivo-style display, a monospace, and
  a condensed. (Exact families finalized at implementation, license-permitting.)
- Per text block: **weight, size, letter-spacing, line-height, alignment**.
- No full font picker — keeps every output on-aesthetic.

## Color

- **Preset palettes** matching the references: black/white, red/black, off-white/charcoal,
  and a few more.
- **Custom hex override** for background / text / accent per design.

## Data model (sketch)

```
Design {
  format: '4:5' | '2:3' | '9:16' | '1:1' | '16:9'
  grid: { cols, rows, margin, gutter }
  archetype: ArchetypeId
  palette: { bg, text, accent }   // preset or custom hex
  shuffleSeed: number
  mode: 'grid' | 'free'
  slots: Slot[]
}
Slot {
  id, role            // 'headline' | 'image' | 'caption' | 'date' | 'glyph' | ...
  geometry            // grid cell span (grid mode) OR absolute box (free mode)
  content             // text string | image ref (objectURL/base64/url)
  type: { family, weight, size, tracking, leading, align }  // for text slots
  fit: 'auto' | 'fixed'
}
```

## Component boundaries

- **Canvas/Renderer** — pure function `Design -> SVG`. No app state; just renders.
- **Grid engine** — resolves slot grid-cells to geometry per format; owns shuffle
  (seeded, constrained re-flow). Pure, unit-testable.
- **Archetype registry** — declarative definitions (slots, rules, adaptation per format).
  Adding an archetype = adding a data entry, not new rendering code.
- **Editor UI** — slot inspector (type/color controls), format switcher, shuffle button,
  mode toggle, image upload/URL input.
- **Exporter** — `Design -> SVG file` and `Design -> rasterized PNG/JPG` (shared render).
- **Store** — current `Design` in memory + localStorage autosave.

## Testing

- Grid engine: unit tests for slot→geometry resolution across all 5 formats; shuffle
  determinism (same seed → same layout) and validity (slots stay within grid/canvas).
- Renderer: snapshot tests of `Design -> SVG` for each archetype.
- Exporter: PNG raster dimensions match format × DPI; SVG embeds fonts and opens valid.

## Security considerations

Low-risk: a static, client-side-only app with no backend, no database, no auth, and no
secrets. The only external input is user-provided image URLs and uploaded files, rendered
into SVG. Mitigations: treat pasted URLs as untrusted (load as `<image>` only, never
inject as markup), sanitize any user text before placing into SVG `<text>` (no raw HTML
injection), and set an appropriate CSP on the Vercel deployment. No personal data,
payments, or privileged surface.

## Open questions for implementation

- Final font families (license-permitting) for the curated set.
- SVG font embedding strategy: subset-embed vs convert-to-outlines (offer as export
  option).
- Default column count per format (e.g. 12-col portrait vs 6-col square).
```

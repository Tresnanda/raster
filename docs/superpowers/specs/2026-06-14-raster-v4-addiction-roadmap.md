# Raster v4 — "Addiction" Roadmap

**Date:** 2026-06-14 · Branch: `feature/raster-controls` (continues)
Goal: turn Raster from a poster maker into a tool people lose hours in. Figma/Photoshop-grade control + generative dopamine loops. Built in waves; each wave ships a preview, stays green, never breaks prior work. No backend (URL/localStorage only).

## Hero features (all requested)
1. **Riff / variation explorer** — from the current poster, generate a live grid of mutated variations (layout/type/palette/style nudged by tunable "strength"). Click one to evolve; **branching history tree** to jump back/forward. Explore-and-evolve loop. *(Wave 1)*
2. **Image effects lab** — per-image treatments with live sliders: halftone, duotone, riso-grain, dither, posterize, threshold, invert, blend modes. Export-safe (SVG filters). *(Wave 1)*
3. **Animate & export video** — kinetic poster loops (type reveal/slide, grain shimmer, element drift, build-on) → export MP4/GIF/WebM. *(Wave 2)*
4. **Series + DB-free share links** — paste a content list → a matched SET of posters in one system; "copy share link" encodes the full design in the URL (no DB); local saved-designs gallery to fork. *(Wave 2)*

## Right-pane control packs (all requested)
- **Transform pack** — rotation, flip H/V, corner radius + stroke/border (shapes), drop shadow, blend mode per element. *(Wave 1)*
- **Type pack** — text transform (UPPER/lower/Title), paragraph indent, column count (body), list/index styling, hanging indent. *(Wave 1)*
- **Layers pack** — per-layer visibility, lock, rename, group/ungroup. *(Wave 2)*
- **Global design tab** — tabbed right pane: Design (live grid columns/rows/margin/baseline, global type scale, theme) vs Element. Grid playground. *(Wave 2)*

## Extra "addiction" mechanics I cooked (Photoshop/Figma table-stakes + hooks)
- **Zoom & pan canvas** (scroll-zoom, space-drag, fit/100%, zoom HUD) — *table-stakes for hours of use.* *(Wave 1)*
- **Multi-select + align/distribute** across a selection (Figma core). *(Wave 2)*
- **Smart guides** — element-to-element edge/center snapping + equal-spacing hints while dragging (beyond canvas-center). *(Wave 2)*
- **Command palette (⌘K)** — do anything fast; power-user feel. *(Wave 2)*
- **Auto-tidy / Magic arrange** — one click balances a messy composition onto the grid (satisfying). *(Wave 3)*
- **Palette from image** — drop a photo → extract a Swiss palette (1 ground/1 ink/1 accent) via color quantization, apply instantly. *(Wave 3)*
- **Type-system presets** — swap whole modular-scale + pairing systems; instant coherent restyle. *(Wave 3)*
- **"Lock system / shuffle content"** and **"lock content / shuffle system"** toggles for Shuffle. *(Wave 3)*
- **Reusable blocks / components** — save an element or group, drop it anywhere. *(Wave 3)*
- **Daily poster / remix challenge** — a daily seed to remix; lightweight engagement loop. *(Wave 3)*
- **Dimensions + distance HUD** while dragging/resizing (Figma-style). *(Wave 2)*
- **Export kit** — one click renders all formats (story/square/poster) + high-res PNG + print PDF. *(Wave 2)*
- **Right-click context menu**, **rulers + draggable guides**, **autosave version snapshots**. *(Wave 3)*

## Wave plan (each ships a preview)
- **Wave 1 (now):** Image effects lab · Transform pack · Type pack · Riff explorer (with history) · Zoom & pan.
- **Wave 2:** Animate→video export · Series + share links + gallery · Layers pack · Global design tab · Multi-select + align/distribute · Smart guides + HUD · Command palette · Export kit.
- **Wave 3:** Auto-tidy · Palette-from-image · Type systems · shuffle-scope toggles · components · daily challenge · context menu/rulers/guides/snapshots.

## Model notes
New `Slot` fields (optional, migration-safe): `rotation`, `flipH/flipV`, `radius`, `stroke`, `strokeWidth`, `shadow`, `blend`, `textTransform`, `hidden`, `locked`, `name`, `imageEffect` (kind + params), plus `opacity` (done). New store: a generic `updateSlot(id, patch)` to keep actions DRY as fields grow. Canvas viewport: `zoom`, `pan` in store. Riff: a `lineage` tree of design snapshots (in-memory + localStorage), `mutate(design, strength)`.

## Security
No new external surface. Share links encode design JSON in the URL (no secrets, no PII). Image effects + video export are client-side canvas/SVG. New libs (gif/webm encoder, color-quantizer) vetted on socket.dev, exact-pinned, signatures verified.

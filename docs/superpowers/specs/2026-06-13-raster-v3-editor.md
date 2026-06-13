# Raster v3 — Full Editor, Generators, Crop, Polish

**Date:** 2026-06-13 · **Branch:** `feature/raster-v2-ui` (continues the redesign)

Turn Raster from a template filler into a real composer: add/select/move/resize/delete/
duplicate elements with z-order + layers, crop images on upload, three genuinely distinct
generators, and a serious editorial-craft polish pass.

## Decisions (confirmed)
- Full editor composer (add Text/Image/Shape/Line; select→move/resize/delete/duplicate; z-order; layers list).
- Three generators: **Shuffle** = rearrange current layout · **Pick for me** = random of the 19 · **Surprise** = procedurally generate a NEW unique Swiss composition (not from the 19).
- Refined editorial (light) polish — custom controls, icons, rhythm, micro-interactions.
- Crop modal locked to the image box's aspect ratio on upload; re-croppable.

## Phase A — model + generators (`src/types.ts`, `src/store`, `src/design`)
- `SlotRole` adds `'line'`. `Slot` adds `z?: number` (z-order; fallback = array index). Added elements use free `box` (absolute), archetype slots keep grid cells; selecting/moving any slot is fine either way (`slotBox` already prefers `box`).
- Store gains UI state `selectedId: string | null` and actions: `addElement(type:'text'|'image'|'block'|'line')` (new id `el-<n>`, centered default box, sensible defaults, `z=maxZ+1`, auto-select), `deleteElement(id)`, `duplicateElement(id)` (offset +24px, select copy), `selectElement(id|null)`, `bringForward(id)`/`sendBackward(id)` (swap z with neighbor), `updateContent`/`setBox`/`setText` (exist). Elements render in ascending `z`.
- **Generators** (store actions, all distinct):
  - `shuffle()` → `reShuffle` (rearrange current — exists).
  - `pickForMe()` → `setLayout(randomOf 1..19)`.
  - `surprise()` → NEW `generate(format, palette?, opts)` in `src/design/generate.ts`: procedurally compose a fresh Swiss/brutalist poster — random palette + style, random composition strategy among ~5 parameterized skeletons (big-word, editorial-zones, index-list, numeral, diptych) with randomized headline size/position, optional image placement, caption clusters in random corners, optional accent block/line. Returns a valid on-grid Design with a `generated` archetype marker and `layout: 0`. Must always be on-grid and composed (use margins, alignment, the 12×16 grid). Genuinely different each call.
- `BottomBar`/`LayoutGrid` reflect that a generated design shows "Generated" (layout 0) not "Layout N".
- Tests: generate() over 50 runs → all slots in-bounds, ≥1 text slot, valid palette; element CRUD (add/delete/duplicate/z-order) behaves; pickForMe lands on a real layout.

## Phase B — composer canvas (`src/ui/ComposerOverlay.tsx`, replaces Edit/Free overlays)
One overlay (canvas-unit sized, scaled to the SVG like before):
- **Select**: click an element → selection outline + 8 resize handles + a small floating toolbar (duplicate, delete, bring-forward, send-back). Click empty canvas → deselect.
- **Move**: drag a selected element (pointer capture; optional shift = axis-lock; snap to grid columns/rows when near, toggleable).
- **Resize**: drag any of 8 handles (corner = free, edge = one axis); min size guard; updates `box`.
- **Edit text**: double-click a text element → inline textarea (reuse the v2 EditOverlay editor, aligned + styled via `resolveTextStyle`); blur/Enter commits.
- **Image**: selected image element shows "replace"/crop affordance; drop image onto it → crop flow.
- **Keyboard**: Delete/Backspace deletes selected; Cmd/Ctrl+D duplicates; arrows nudge; Esc deselects.
- Replaces the `mode==='free'?FreeOverlay:EditOverlay` split — the composer is the single interaction surface. Keep a "snap to grid" toggle.

## Phase C — crop (`src/ui/CropModal.tsx`, dep `react-easy-crop`)
On any image upload/drop (sidebar ImageInput or canvas drop), open a modal cropper locked to the target box's aspect ratio (zoom + pan). Confirm → produce a cropped dataURL (canvas `drawImage` from `react-easy-crop` pixel area) → `setContent`. Cancel → discard. Re-crop from the element toolbar / sidebar. `react-easy-crop` is MIT — verify on socket.dev, exact-pin, `pnpm audit signatures`.

## Phase D — UI polish (refined editorial light) (`src/ui/*`, dep `lucide-react`)
Replace plain/native controls with crafted ones, keep the white Swiss aesthetic:
- **Upload**: replace the native `<input type=file>` ("Choose File") with a custom dropzone button (icon + "Upload image" + "or drop / paste URL"), dashed hover, matches the reference.
- **Sliders**: ensure the shadcn Slider is actually used + styled (track/range/thumb), value in `tabular-nums`.
- **Checkboxes**: custom styled (not raw native) — small rounded check, accent fill.
- **Segmented controls** for CANVAS formats and any binary toggles; black active.
- **Icons** via `lucide-react` (Shuffle, Sparkles, Dice, Upload, Trash, Copy, layers, etc.). MIT — exact-pin, audit.
- **Generation buttons**: three clearly distinct buttons — Shuffle (⇄/shuffle icon), Pick for me (dice icon), Surprise (sparkles icon) — with labels + helper microcopy clarifying each does something different.
- **Composer panel** (right of canvas or a top canvas toolbar): "+ Text / + Image / + Shape / + Line" add buttons, a compact **Layers** list (reorderable, select, hide?, delete), and the selected-element controls. Place as a slim right rail OR a floating top toolbar on the stage — keep the canvas dominant.
- Rhythm: consistent section spacing, hairline dividers, uppercase micro-labels, focus rings, empty states ("No element selected"). Hover/press micro-interactions per the design-engineering skill (`:active` scale 0.97, `cubic-bezier(0.23,1,0.32,1)`, hover lifts). No `transition: all`.

## Phase E — motion polish (GSAP)
- Selection outline animates in (fast, <150ms). Add-element: new element pops in (scale 0.96→1, 200ms). Delete: quick fade/scale-out. Layers list reorder: FLIP. Crop modal: scale-from-center 200ms, backdrop fade. Keep the v2 reflow for generators (Surprise gets a slightly bigger entrance). All reduced-motion-guarded. Don't animate frequent controls.

## localStorage / migration
Persist elements + z. Old saves migrate (add `z` by index, `selectedId=null`). Don't crash.

## Security considerations
No new external surface. Cropping is client-side canvas. Uploaded/dropped/pasted images still rendered as `<image>` (data/blob/https only per CSP). `react-easy-crop` + `lucide-react` are reputable MIT libs — vet on socket.dev, exact-pin, verify signatures. No `dangerouslySetInnerHTML`. Low-risk, client-only.

## Out of scope (v3)
Multi-select, grouping, undo/redo history (nice future), custom fonts upload, multi-page.

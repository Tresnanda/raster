# Raster Wave 3 Implementation Plan

> **For agentic workers (Codex):** Implement this plan task-by-task, top to bottom. Steps use checkbox (`- [ ]`) syntax for tracking. Each `src/design/*` module is PURE and must ship with a Vitest file before its UI is wired. Do NOT start a phase until the prior phase's tests pass.

**Goal:** Ship Wave 3 — the "magic + habit-loop" layer on top of the addictive-features branch: Auto-tidy, Palette-from-image, Type-system presets, Shuffle-scope toggles, Reusable components, a deepened Daily Remix, and Editor table-stakes (context menu, rulers/guides, snapshots). Fold in the two correctness fixes found in review of `codex/raster-addictive-features`.

**This plan assumes the `codex/raster-addictive-features` branch is the base.** That branch already shipped the seeded+scored generator, Poster Mine, Daily Swiss Briefs, System Recipes, Grid Coach, and Campaign Studio. Several Wave 3 items therefore EXTEND existing code rather than create it — read the "Reconciliation" section first or you will rebuild things that exist.

---

## Reconciliation with what already exists (READ FIRST)

| Wave 3 item | Status on branch | What this plan does |
|---|---|---|
| **Daily remix** | ✅ **Already built** — `src/design/daily-briefs.ts` does deterministic `hash(date) → seed → generate()`, with "Start/Restart brief". | DO NOT rebuild. Only add the **streak counter** (Phase 1d) to deepen the come-back loop. |
| **Type-system presets** | 🟡 Partial — `system-recipes.ts` saves *user* skeletons (layout+type+palette+style). | Add a SEPARATE module of **curated built-in typographic systems** (typography-only). Different concept; do not merge into recipes. |
| **Auto-tidy** | 🟡 Adjacent — `grid-coach.ts` has `applyCoachFix('tighten-hierarchy' | 'reduce-density')` (per-finding nudges). | Build a holistic ONE-PASS rebalance that reuses grid-coach + generator primitives. Reuse `contrastRatio`, `OccupancyGrid`, `resolveTextCollisions` — do not duplicate them. |
| **Shuffle-scope toggles** | 🟡 Infra ready — `generate()` accepts `{ seed, grammar }`; `series.ts` already injects content into a template. | Add content-only and system-only reshuffles on top of that infra. |
| **Palette from image** | ❌ Not built | New pure module + canvas wrapper. |
| **Reusable components** | ❌ Not built (Poster Mine saves whole posters, not element groups). | New module + localStorage store + drop UI. |
| **Editor table-stakes** | ❌ Not built | Context menu (shadcn), rulers/guides, snapshots. |

---

## Cross-cutting guardrails (NON-NEGOTIABLE — apply to every task)

1. **Pure-model + commit.** Every edit mutates the immutable `Design` data model and goes through the store's `commit(next, { coalesceKey? })` so undo/redo works. Never imperatively mutate the rendered SVG. Read-only derivations (scores, palettes) can be computed inline but should be `useMemo`'d in components.
2. **Respect `overridden[]`.** Any global/system change (typography, palette, type-system) MUST skip fields a slot has overridden. Mirror the `pick(field, globalValue)` pattern already in `grid-coach.ts:resolvedTextStyle`.
3. **Seeded RNG only in generative paths.** Use `mulberry32(seed)` (see `generate.ts`). Never call `Math.random()` inside anything testable as an invariant. **In tests, always pass a fixed `seed`** so the suite is deterministic (this is also Phase 0, fix #1).
4. **Swiss invariants must survive every transform.** After Auto-tidy / palette / type / shuffle, these must still hold (add property tests, seeded): text/bg contrast ≥ 4.5 (`grid-coach.contrastRatio`), exactly one dominant text ≥ 2× the second size, occupied ≤ 70% of the 12×16 grid, all cells in-bounds, zero text-on-text overlap (`resolveTextCollisions`), dominant not dead-center (edge tension).
5. **localStorage discipline.** Follow the existing `read*/write*` try/catch pattern, add a `*_KEY` constant, cap array length. AND apply Phase 0 fix #2: guard quota and strip/shrink image bytes before persisting (never silently lose a save).
6. **UI = neo-brutalism + shadcn only.** Tokens only (`shadow-brutal`, `--radius`, Geist / Space Mono-for-numbers), `aria-label` on every control, no em dashes in any user-facing/generated string. New shadcn primitives via `npx shadcn add <name>` — never hand-roll, and never let it overwrite the existing brutalist `button/dialog/input/textarea` (run without `-o`; if it clobbers, `git checkout` them back).
7. **Dependencies.** Prefer ZERO new deps (hand-write the color quantizer). If one is unavoidable, check `socket.dev/npm/package/<name>` first, pin exact (no `^`/`~`), and `pnpm audit signatures` after. `.npmrc save-exact` stays.
8. **Branching.** Work on a `feature/raster-wave3` branch (or stacked feature branches per phase). Open a PR only on explicit request.

---

## Phase 0 — Review fixes from `codex/raster-addictive-features` (do first; fast, independent)

### 0a. Deterministic property tests
- [x] In `src/design/generate.test.ts`, change every `generate('3:4')` inside the 200-/50-iteration loops to `generate('3:4', { seed: i })`. Keeps coverage, makes the suite reproducible. (Confirmed flake today: unseeded runs fail ~1/30.)
- [x] Verify: run `npm test` 20× (or a loop) — zero failures.

### 0b. Poster Mine quota / silent-loss guard
- [x] In `src/design/poster-mine.ts`, make the persisted copy lightweight: strip or downscale image bytes (`content` dataURLs + `imageSrcOriginal`) to a small thumbnail for the SAVED design (the in-canvas working design keeps full-res). Mirror the byte-stripping already in `src/design/share.ts`.
- [x] In `src/store/useDesign.ts:saveCurrentPoster`, detect a failed write (have `writeSavedPosters` return a boolean) and surface a "storage full" state instead of optimistically `set()`-ing a poster that won't survive reload.
- [x] Test: a design with a large fake dataURL still persists (round-trips through `read/writeSavedPosters`); the in-memory list does not claim success when the write throws.

### 0c. Cheap polish (optional, same PR)
- [x] `GridCoachControls`: wrap `buildGridCoachReport(design)` in `useMemo(() => …, [design])`.
- [x] Commit the currently-uncommitted working-tree changes on the branch (grid-coach bounds expansion + "Studio"/"Saved snapshots" copy) so they're actually part of history.
- [ ] Prune dead generator branches if trivial: retired `oversized-glyph` DominantType, `v-band` ImageTreatment, and the scrim-removal block in `enforceWhitespace`. (Low priority — they're inert.)

---

## Phase 1 — Pure-logic features (high value, low risk, parallelizable)

Each is: one pure `src/design/*` module + test, one store action, one small sidebar surface, plus a ⌘K command entry in `CommandPalette.tsx`.

### 1a. Auto-tidy (`src/design/auto-tidy.ts`)
**What:** One click rebalances the CURRENT design onto the grid without changing content or roles.
**Algorithm (single pass over `design.slots`):**
1. For free-positioned slots (those with a `box`), snap to the nearest grid `cell` (convert px → nearest `{c,cs,r,rs}` via `lib/grid`), then drop the `box` so they're grid-driven again.
2. Re-seat into a fresh `OccupancyGrid` in z-order (dominant first). Use `resolveTextCollisions` for text-on-text, and reuse `enforceWhitespace`-style trimming only if occupancy > 70% (drop nothing destructive — shrink instead where possible).
3. Re-establish hierarchy: ensure exactly one `typeClass:'title'` dominant; if the contrast/edge invariants fail, reuse `grid-coach.applyCoachFix` helpers internally.
4. Preserve all slot `id`s, `content`, `role`, `text`, images, and `overridden`.
**Exports:** `tidy(design: Design): Design`.
**Store:** `autoTidy()` → `commit(tidy(get().design))`.
**UI:** button in a new "Arrange" group (sidebar) + ⌘K "Auto-tidy" + context-menu item (Phase 3).
**Tests (seeded):** idempotent (`tidy(tidy(x))` deep-equals `tidy(x)`); slot ids/content set unchanged; zero overlaps + in-bounds after; runs on a deliberately-messed fixture (overlapping/off-grid slots) and yields a valid layout.

### 1b. Palette from image (`src/design/palette-extract.ts`)
**What:** Drop a photo → extract a Swiss-correct `{ bg, text, accent }`.
**Algorithm (no new deps — hand-write):**
1. Pure core `extractPalette(pixels: Uint8ClampedArray, w, h): Palette` operating on already-decoded RGBA — median-cut quantize to ~5–8 buckets by population.
2. Assign Swiss roles: `bg` = the dominant near-neutral / extreme-luminance bucket; `text` = pick black `#0a0a0a` or white `#ffffff` to guarantee `contrastRatio(bg, text) ≥ 4.5` (reuse `grid-coach.contrastRatio`); `accent` = the most-saturated bucket that is distinct from bg and text.
3. Thin browser wrapper `paletteFromImageFile(file: File): Promise<Palette>` — draw to an offscreen canvas downscaled to ~64px, read `getImageData`, call the pure core.
**Store:** `applyExtractedPalette(p: Palette)` → patch `design.palette` via `commit`.
**UI:** a drop zone / "Pull palette from image" button in the Style section; show the 3 swatches before apply.
**Tests:** deterministic on a fixed synthetic `ImageData` fixture; asserts contrast ≥ 4.5 and accent saturation > threshold; handles a flat single-color image gracefully.

### 1c. Type-system presets (`src/design/type-systems.ts`)
**What:** Curated, named typographic SYSTEMS (scale + pairing + tracking/leading) you apply instantly. Distinct from user-saved System Recipes.
**Data:** `TYPE_SYSTEMS: TypeSystem[]` (~6–8), each `{ id, name, typeface, title, headline, body, tracking, leading }` — e.g. "Grotesk Monument", "Editorial Serif×Sans", "Mono Technical", "Condensed Sport", "Neue Quiet".
**Apply:** `applyTypeSystem(design, id): Design` patches `design.typography` AND re-derives sizes for non-overridden text slots only (respect `overridden`, guardrail #2).
**Store:** `applyTypeSystem(id)` → `commit`.
**UI:** chip row in the Type section (active state highlighted).
**Tests:** applying changes `typography` but leaves overridden slots untouched; deterministic; switching A→B→A returns to A's typography.

### 1d. Daily Remix — streak deepening (extends existing `daily-briefs.ts`)
**What:** Daily Remix already works; add the habit hook.
- [x] New `src/design/streak.ts`: `recordVisit(today, prev): StreakState` computing `{ current, longest, lastDate }` (consecutive-day logic), localStorage-backed (`raster:streak`).
- [x] `DailyBriefControls`: show "🔥 N-day streak" and "Done today ✓" once applied.
- [x] Tests: consecutive days increment; a gap resets `current` (not `longest`); same-day re-visit is a no-op.

---

## Phase 2 — Shuffle-scope toggles (generator-coupled)

### 2a. Content / system reshuffles (`src/design/reshuffle.ts`)
**What:** Three scopes for Surprise/Shuffle: **All** (current behavior), **Content** (lock the system, swap words), **System** (lock the words, rebuild the layout).
- **Content:** `reshuffleContent(design, seed): Design` — keep every slot's `cell`, `text`, `typeClass`, palette, style, grammar; only re-`pick` `content` strings from the role-appropriate pools in `generate.ts` (export the pools or a `contentForRole(role, rng)` helper from there — do not duplicate the word lists).
- **System:** `reshuffleSystem(design, seed): Design` — collect current text content by role, run `generate()` for a fresh skeleton, then inject the saved content into the matching roles (reuse the content-injection approach from `series.ts`).
**Store:** add `shuffleScope: 'all' | 'content' | 'system'` + `setShuffleScope`; branch `surprise()`/`shuffle()` on it.
**UI:** a 3-way segmented control near the Shuffle/Surprise buttons.
**Tests (seeded):** content-shuffle keeps all `cell`s + typography byte-identical and changes ≥1 content string; system-shuffle keeps the content set and changes the layout fingerprint; all scopes preserve the Swiss invariants (guardrail #4).

---

## Phase 3 — Editor table-stakes + Reusable components (heaviest; do last)

### 3a. Reusable components (`src/design/components.ts`)
**What:** Save the selected element or multi-select group as a named component; drop it onto any poster.
**Data:** `SavedComponent { id, name, slots: Slot[], createdAt }` where `slots` store positions RELATIVE to the group's bounding cell (top-left = origin). localStorage `raster:components`, capped, image bytes stripped/shrunk (guardrail #5).
**Save:** `saveComponent(name)` snapshots `selectedIds`' slots, normalizes offsets.
**Insert:** `insertComponent(id, atCell?)` clones slots, regenerates fresh `id`s (avoid collisions), offsets to `atCell` (default a free region via `OccupancyGrid`), adds via one `commit` (single undo step using the existing `setBoxes` batch pattern).
**UI:** "Save as component" in the multi-select panel + context menu; a components tray to insert from.
**Tests:** round-trip save→insert preserves relative geometry; new ids are unique vs existing; content/text/images preserved.

### 3b. Context menu (shadcn `context-menu`)
- [ ] `npx shadcn add context-menu` (do not overwrite existing brutalist primitives).
- [ ] Wire `onContextMenu` in `ComposerOverlay.tsx` on a selected element: Cut / Copy / Paste / Duplicate / Delete, Bring forward / Send back, Lock / Hide, Align (reuse `alignSelection`), "Save as component", "Auto-tidy". All actions route through existing store actions.
- [ ] Tests: menu renders for a selected slot; each item dispatches the right store action (RTL).

### 3c. Rulers + draggable guides
**What:** Top + left rulers in poster units; drag from a ruler to create a guide; elements snap to guides.
- [x] Store: `guides: { axis: 'x' | 'y'; pos: number }[]` + `addGuide/removeGuide/clearGuides` (NOT undo-tracked, or a separate light history — decide and document).
- [x] Render rulers as a `CanvasStage` overlay (tick marks scale with zoom — reuse the existing `safeScale / zoom` math from ComposerOverlay).
- [ ] Drag-to-create from ruler; integrate guide snapping into the existing move/resize snap logic alongside element smart-guides.
- [x] Tests: pure snap helper (`snapToGuides(value, guides, threshold)`) unit-tested; add/remove guide reducer-tested.

### 3d. Version snapshots
**What:** Lightweight in-session named checkpoints with quick restore (distinct from undo/redo and from Poster Mine's archive).
- [x] Reuse Poster Mine infra: add `source: 'snapshot'` and a "Pin snapshot" action + a horizontal snapshot strip with one-click restore (restore = `loadSavedPoster`-style `commit`). This avoids a parallel persistence layer.
- [x] Tests: pin creates a `source:'snapshot'` entry; restore swaps the design and is undoable.

---

## Suggested sequencing & PR boundaries
- **PR 1 = Phase 0** (review fixes) — merge first; unblocks a green CI.
- **PR 2 = Phase 1** (Auto-tidy, Palette, Type-systems, Streak) — parallelizable internally; biggest user-visible "magic".
- **PR 3 = Phase 2** (Shuffle-scope).
- **PR 4 = Phase 3** (Components + editor table-stakes) — largest; can split 3a/3b vs 3c/3d if needed.

## Definition of done (every PR)
- [x] `npm run build` (`tsc -b && vite build`) clean.
- [x] `npm test` green, run 20× with zero flakes (seeded).
- [x] No new `^`/`~` deps; `.npmrc` untouched; `pnpm audit signatures` clean if deps changed.
- [x] New user-facing strings have no em dashes; all controls have `aria-label`.
- [x] Swiss invariants property-tested where the feature transforms a layout.

# Raster Addictive Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full creative-flow feature set: Poster Mine, Daily Swiss Briefs, System Recipes, Swiss Grid Coach, Campaign Studio, and Motion Lab 2, then deploy a Vercel preview.

**Architecture:** Keep domain logic in small `src/design/*` modules with Vitest coverage, then wire UI through existing Zustand actions and sidebar/modal patterns. Store long-session artifacts in localStorage-compatible snapshots so Raster remains client-only.

**Tech Stack:** React 19, TypeScript, Zustand, Vite, Vitest, existing shadcn/Radix primitives, GSAP motion, Vercel preview deployment.

---

## File Map

- Create `src/design/poster-mine.ts` and `src/design/poster-mine.test.ts` for saved-poster persistence, naming, tags, favorites, and parent lineage helpers.
- Create `src/design/daily-briefs.ts` and `src/design/daily-briefs.test.ts` for deterministic daily Swiss brief selection and design generation.
- Create `src/design/system-recipes.ts` and `src/design/system-recipes.test.ts` for extracting/applying reusable visual systems.
- Create `src/design/grid-coach.ts` and `src/design/grid-coach.test.ts` for readability/grid critique scoring and one-click fix recommendations.
- Extend `src/design/series.ts` and `src/design/series.test.ts` for campaign board item state and per-item overrides.
- Extend `src/design/motion.ts` and `src/design/motion.test.ts` for Motion Lab sequence presets, timing, and loop metadata.
- Modify `src/store/useDesign.ts` and store tests for feature state/actions.
- Add sidebar/modal UI files for the new feature surfaces and mount them from `src/ui/Sidebar.tsx` / `src/ui/App.tsx`.
- Extend `src/ui/CommandPalette.tsx` with quick actions for mine save/open, daily brief, coach, recipes, and motion playback.

## Task 1: Poster Mine Domain + Store

- [ ] Write failing tests for creating saved poster snapshots, deriving titles, toggling favorite, tagging, deleting, loading, and preserving parentId/source metadata.
- [ ] Verify tests fail with missing `poster-mine` module/actions.
- [ ] Implement `src/design/poster-mine.ts` and store actions: `saveCurrentPoster`, `openMine`, `loadSavedPoster`, `deleteSavedPoster`, `toggleSavedPosterFavorite`, `updateSavedPosterTags`.
- [ ] Verify focused tests pass.

## Task 2: Poster Mine UI

- [ ] Write failing UI tests for save/open buttons and modal rendering saved designs with actions.
- [ ] Verify tests fail before UI exists.
- [ ] Implement `PosterMineControls` and `PosterMineModal` using existing `Renderer` mini previews.
- [ ] Mount modal in `App` and controls in sidebar.
- [ ] Verify focused UI tests pass.

## Task 3: Daily Swiss Briefs

- [ ] Write failing tests for deterministic date-based briefs and applying a brief-generated design.
- [ ] Verify tests fail.
- [ ] Implement `daily-briefs` domain and store action `applyDailyBrief`.
- [ ] Add a sidebar panel showing today’s brief, constraints, and “Start brief”.
- [ ] Verify focused tests pass.

## Task 4: System Recipes

- [ ] Write failing tests for extracting a recipe from the current design and applying it to another design while preserving content.
- [ ] Verify tests fail.
- [ ] Implement recipe helpers plus store actions `saveCurrentRecipe`, `applyRecipe`, `deleteRecipe`.
- [ ] Add a sidebar panel for saving/applying recipes.
- [ ] Verify focused tests pass.

## Task 5: Swiss Grid Coach

- [ ] Write failing tests for coach scoring on alignment, contrast, hierarchy, whitespace, and overlap/occlusion.
- [ ] Verify tests fail.
- [ ] Implement `grid-coach` domain and store action `applyCoachFix`.
- [ ] Add a sidebar panel with score, findings, and one-click fixes.
- [ ] Verify focused tests pass.

## Task 6: Campaign Studio

- [ ] Write failing tests for campaign item creation, per-item text override, active item loading, and batch export data.
- [ ] Verify tests fail.
- [ ] Extend `series` helpers and store actions for `campaignItems`, `setCampaignRaw`, `loadCampaignItem`, and `updateCampaignItemTitle`.
- [ ] Upgrade `SeriesControls` into a visual board while keeping zip export.
- [ ] Verify focused tests pass.

## Task 7: Motion Lab 2

- [ ] Write failing tests for motion sequence metadata and preset timing.
- [ ] Verify tests fail.
- [ ] Extend `motion` helpers and store state for `motionSequence`.
- [ ] Upgrade motion controls with tempo/delay/loop controls and pass sequence options into playback.
- [ ] Verify focused tests pass.

## Task 8: Integration, Build, Commit, Preview

- [ ] Run full `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Commit the implementation on `codex/raster-addictive-features`.
- [ ] Push the branch.
- [ ] Create and inspect a Vercel preview deployment.
- [ ] Report the preview URL and verification evidence.

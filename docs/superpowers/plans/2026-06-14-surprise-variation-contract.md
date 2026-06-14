# Surprise Variation Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Raster's `Surprise` generator visibly vary its poster structures while preserving Swiss grid legibility.

**Architecture:** Add an explicit generation brief that selects the intended poster density, image presence, accent behavior, and scoring target before candidates are built. Candidate scoring then ranks posters within that brief, so valid creative families compete with themselves rather than losing to one globally safest recipe.

**Tech Stack:** TypeScript, Vitest, Raster's existing procedural generator in `src/design/generate.ts`.

---

### Task 1: Add Structure-Diversity Regression Tests

**Files:**
- Modify: `src/design/generate.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that generate 120 seeded posters and count visible structure recipes. Assert that no single recipe exceeds 35% of outputs, that accent-free posters remain present, that dense posters remain present, and that image-free posters remain present.

- [ ] **Step 2: Run the focused test file**

Run: `pnpm exec vitest run src/design/generate.test.ts`

Expected: FAIL because the current scorer selects the same safe recipe too often and almost always includes an accent.

### Task 2: Add Generation Briefs

**Files:**
- Modify: `src/types.ts`
- Modify: `src/design/generate.ts`

- [ ] **Step 1: Extend generation metadata**

Add a `GenerationBrief` type that records:

```ts
export interface GenerationBrief {
  density: 'quiet' | 'balanced' | 'dense'
  imageMode: 'none' | 'optional' | 'required'
  accentMode: 'none' | 'optional' | 'required'
}
```

Add `brief: GenerationBrief` to `GenerationMeta`.

- [ ] **Step 2: Build a seeded brief per Surprise run**

In `generate()`, choose the grammar and a brief once per seed. Pass the brief to every candidate for that run.

### Task 3: Enforce Brief-Aware Candidate Selection

**Files:**
- Modify: `src/design/generate.ts`

- [ ] **Step 1: Adapt skeletons to brief constraints**

When `imageMode` is `none`, force `imageTreatment: 'none'`. When `imageMode` is `required`, avoid `'none'`. When `accentMode` is `none`, force `accentType: 'none'`. When `accentMode` is `required`, avoid `'none'`.

- [ ] **Step 2: Score density targets**

Reward candidate structures that match the brief's supporting text count and slot count. Penalize missing required image or required accent, and penalize extra accent when the brief asks for none.

- [ ] **Step 3: Keep readability gates intact**

Keep the existing no-overlap, one-title, whitespace, and controlled-occlusion rules.

### Task 4: Verify and Ship Preview

**Files:**
- Test: `src/design/generate.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `pnpm exec vitest run src/design/generate.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 3: Commit and push**

Commit message: `feat(design): diversify surprise generation briefs`

- [ ] **Step 4: Deploy preview**

Run: `pnpm dlx vercel@latest deploy --yes`

Expected: Vercel returns a ready preview URL.

# Swiss Industrial Surprise Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Raster's `Surprise` generator follow Swiss industrial poster rules with a controlled occlusion grammar instead of accidental-looking overlays.

**Architecture:** Keep the generator local to `src/design/generate.ts`, extending the existing grammar/scoring model rather than creating a second engine. Add generation metadata for expressive moves and occlusion readability so tests can enforce the design rules.

**Tech Stack:** TypeScript, Vitest, Zustand store consumers, Vite build.

---

### Task 1: Document Design Rules

**Files:**
- Create: `docs/references/swiss-industrial-poster-rules.md`

- [ ] **Step 1: Write the guide**

Create a reference guide with source links, reference families, generator rules,
and Raster scoring targets for controlled occlusion.

- [ ] **Step 2: Review the guide**

Run: `rg -n "TB[D]|TO[D]O|place[[:alpha:]]+er" docs/references/swiss-industrial-poster-rules.md`
Expected: no matches.

### Task 2: Add Failing Tests For Controlled Occlusion

**Files:**
- Modify: `src/design/generate.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect:

```ts
const d = generate('4:5', {
  seed: 240614,
  candidateCount: 16,
  grammar: 'occlusion-bar',
})

expect(d.generation?.grammar).toBe('occlusion-bar')
expect(d.generation?.expressiveMove).toBe('controlled-occlusion')
expect(d.generation?.readability.expressiveMoveCount).toBeLessThanOrEqual(1)
expect(d.generation?.readability.occludedTitleFraction).toBeGreaterThan(0)
expect(d.generation?.readability.occludedTitleFraction).toBeLessThanOrEqual(0.35)
```

- [ ] **Step 2: Verify red**

Run: `pnpm exec vitest run src/design/generate.test.ts`
Expected: fail because the grammar and metadata do not exist yet.

### Task 3: Implement Grammar And Scoring

**Files:**
- Modify: `src/types.ts`
- Modify: `src/design/generate.ts`

- [ ] **Step 1: Extend metadata types**

Add `occlusion-bar` to `SwissGrammar`, add `expressiveMove` to
`GenerationMeta`, and add `expressiveMoveCount` plus
`occludedTitleFraction` to `GenerationReadability`.

- [ ] **Step 2: Add occlusion grammar**

Add an `occlusion-bar` grammar that creates a macro title plus supporting
metadata, then inserts one accent block named `controlled-occlusion` above the
dominant title.

- [ ] **Step 3: Score controlled occlusion**

Detect controlled occlusion blocks, compute their intersection with the title
cell, and penalize candidates with more than one expressive move or more than
35% title occlusion.

- [ ] **Step 4: Verify green**

Run: `pnpm exec vitest run src/design/generate.test.ts`
Expected: all generator tests pass.

### Task 4: Full Verification And Publish

**Files:**
- No new files.

- [ ] **Step 1: Full verification**

Run: `pnpm test`
Expected: all tests pass.

Run: `pnpm build`
Expected: build exits `0`; existing CSS import/chunk warnings may remain.

- [ ] **Step 2: Commit and deploy**

Run:

```bash
git add docs/references/swiss-industrial-poster-rules.md docs/superpowers/plans/2026-06-14-swiss-industrial-surprise-rules.md src/design/generate.test.ts src/design/generate.ts src/types.ts
git commit -m "feat(design): add controlled swiss occlusion rules"
git push
pnpm dlx vercel@latest deploy --yes
```

Expected: Vercel reports a ready preview URL.

# Transform Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rotation, flip, corner radius, stroke, drop shadow, and blend mode per-element controls to Raster's editor — covering the full Model + Store + Renderer + Inspector layers with tests.

**Architecture:** A generic `updateSlot(id, patch, coalesceKey?)` action is the single write path; thin helpers (`setRotation`, `setFlip`, etc.) call it. The Renderer computes a `transform` string centered on `cx,cy` for each slot's `<g>`, adds `<filter>` defs for shadow and clipPath defs for image radius, and resolves stroke tokens. The ComposerRail gains a TRANSFORM section inside the existing "All elements" area with tabular-nums number inputs, slider, toggle buttons, selects and swatches — all driven by the new helpers.

**Tech Stack:** TypeScript (strict), React 19, Zustand 5, SVG, Vitest 4, @testing-library/react 16, lucide-react 1.18.

---

## File Map

| File | Status | What changes |
|------|--------|-------------|
| `src/types.ts` | **Modify** | Add 7 optional fields to `Slot` + `Shadow` interface |
| `src/store/useDesign.ts` | **Modify** | Add `updateSlot` + 7 thin helpers to `State` interface + implementation |
| `src/store/useDesign.test.ts` | **Modify** | Store tests for new actions |
| `src/render/Renderer.tsx` | **Modify** | Transform, shadow filter defs, blend style on `<g>` |
| `src/render/slot-image.tsx` | **Modify** | Support `radius` clipPath, `stroke`/`strokeWidth` overlay |
| `src/render/Renderer.test.tsx` | **Modify** | Renderer tests for rotation, flip, shadow, radius, blend |
| `src/ui/ComposerRail.tsx` | **Modify** | TRANSFORM section in inspector |
| `src/ui/ComposerRail.test.tsx` | **Modify** | Inspector tests for all TRANSFORM controls |

No new files. All additions are additive (optional fields, new actions, new JSX blocks).

---

## Transform Math Approach

For a slot with box center `(cx, cy)`:

```
rotate(deg, cx, cy)                    — SVG rotate() with explicit center
flipH: translate(2*cx, 0) scale(-1, 1) — mirror in-place around cx
flipV: translate(0, 2*cy) scale(1, -1) — mirror in-place around cy
```

When both rotation and flips are set, they are composed as a single space-separated SVG transform string applied to the `<g>`. SVG transforms compose left-to-right (each applied in order), so we apply rotation first, then flip, which keeps the element visually centered. Example: `rotate(45 540 675) translate(1080 0) scale(-1 1)`.

Verification: rotating 90° then flipping H still keeps the center at `(cx, cy)` because both operations are defined relative to that center.

---

## Task 1: Extend `Slot` type with transform fields

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1.1: Write a failing type-level test that imports the new fields**

Add to `src/types.test.ts`:

```typescript
import type { Slot } from './types'

test('Slot accepts optional transform fields', () => {
  const s: Slot = {
    id: 'x', role: 'block', cell: { c: 0, cs: 1, r: 0, rs: 1 }, content: '',
    rotation: 45, flipH: true, flipV: false, radius: 20,
    stroke: '#ff0000', strokeWidth: 2,
    shadow: { dx: 0, dy: 8, blur: 16, color: '#000000' },
    blend: 'multiply',
  }
  expect(s.rotation).toBe(45)
  expect(s.shadow?.blur).toBe(16)
})
```

- [ ] **Step 1.2: Run test — confirm it fails (TypeScript error on `rotation`)**

```bash
pnpm vitest run src/types.test.ts
```

Expected: type error / test error because `rotation` does not exist on `Slot`.

- [ ] **Step 1.3: Add `Shadow` interface and new `Slot` fields to `src/types.ts`**

Insert after the existing `Slot` interface closing `}` (after line 78 in current file):

Add the `Shadow` interface right before the `Slot` interface (before the `export interface Slot` line):

```typescript
export interface Shadow {
  dx: number
  dy: number
  blur: number
  color: string
}
```

Then add these fields inside `Slot` (after the `opacity?: number` field):

```typescript
  /** Rotation in degrees (-180..180). Positive = clockwise. */
  rotation?: number
  /** Mirror horizontally. */
  flipH?: boolean
  /** Mirror vertically. */
  flipV?: boolean
  /** Corner radius in px for block/image elements. */
  radius?: number
  /** Stroke colour: hex string, 'accent', or 'text'. */
  stroke?: string
  /** Stroke width in px. */
  strokeWidth?: number
  /** Drop shadow. null means explicitly cleared. */
  shadow?: Shadow | null
  /** CSS mix-blend-mode keyword. 'normal' or unset = no blend. */
  blend?: string
```

- [ ] **Step 1.4: Run the type test — confirm it passes**

```bash
pnpm vitest run src/types.test.ts
```

Expected: PASS

- [ ] **Step 1.5: Run full suite to confirm no regressions**

```bash
pnpm vitest run
```

Expected: 344 + 1 = 345 tests pass.

- [ ] **Step 1.6: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat(types): add Shadow interface and transform fields to Slot"
```

---

## Task 2: Add `updateSlot` + thin helpers to store

**Files:**
- Modify: `src/store/useDesign.ts`
- Modify: `src/store/useDesign.test.ts`

- [ ] **Step 2.1: Write failing store tests**

Add to `src/store/useDesign.test.ts` (append at end):

```typescript
// ── updateSlot ─────────────────────────────────────────────────────────────────

test('updateSlot patches a field and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().updateSlot(id, { rotation: 90 })
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBe(90)
  // undoable
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBeUndefined()
})

test('updateSlot with coalesceKey does not grow history on repeated calls', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().updateSlot(id, { rotation: 10 }, `rotation:${id}`)
  useDesign.getState().updateSlot(id, { rotation: 20 }, `rotation:${id}`)
  useDesign.getState().updateSlot(id, { rotation: 30 }, `rotation:${id}`)
  // Coalescing: only one history entry added for the batch
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setRotation ────────────────────────────────────────────────────────────────

test('setRotation sets rotation field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setRotation(id, 45)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBe(45)
})

test('setRotation coalesces: repeated calls do not grow history unboundedly', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setRotation(id, 10)
  useDesign.getState().setRotation(id, 20)
  useDesign.getState().setRotation(id, 30)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setFlip ────────────────────────────────────────────────────────────────────

test('setFlip H sets flipH', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'H', true)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipH).toBe(true)
})

test('setFlip V sets flipV', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'V', true)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipV).toBe(true)
})

test('setFlip H false clears flipH', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'H', true)
  useDesign.getState().setFlip(id, 'H', false)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipH).toBe(false)
})

// ── setRadius ─────────────────────────────────────────────────────────────────

test('setRadius sets radius field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setRadius(id, 20)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.radius).toBe(20)
})

test('setRadius coalesces', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setRadius(id, 5)
  useDesign.getState().setRadius(id, 10)
  useDesign.getState().setRadius(id, 15)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setStroke / setStrokeWidth ────────────────────────────────────────────────

test('setStroke sets stroke field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setStroke(id, '#ff0000')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.stroke).toBe('#ff0000')
})

test('setStrokeWidth sets strokeWidth field and coalesces', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setStrokeWidth(id, 2)
  useDesign.getState().setStrokeWidth(id, 4)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.strokeWidth).toBe(4)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setShadow ─────────────────────────────────────────────────────────────────

test('setShadow sets shadow field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setShadow(id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
  const shadow = useDesign.getState().design.slots.find(s => s.id === id)!.shadow
  expect(shadow).toEqual({ dx: 0, dy: 8, blur: 16, color: '#000000' })
})

test('setShadow null clears shadow', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setShadow(id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
  useDesign.getState().setShadow(id, null)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.shadow).toBeNull()
})

// ── setBlend ──────────────────────────────────────────────────────────────────

test('setBlend sets blend field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setBlend(id, 'multiply')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.blend).toBe('multiply')
})

test('setBlend normal sets blend to normal', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setBlend(id, 'multiply')
  useDesign.getState().setBlend(id, 'normal')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.blend).toBe('normal')
})
```

- [ ] **Step 2.2: Run tests — confirm they fail (actions don't exist yet)**

```bash
pnpm vitest run src/store/useDesign.test.ts
```

Expected: errors referencing `updateSlot`, `setRotation`, `setFlip`, `setRadius`, `setStroke`, `setStrokeWidth`, `setShadow`, `setBlend` not on store state.

- [ ] **Step 2.3: Add `updateSlot` + helpers to the `State` interface in `src/store/useDesign.ts`**

Find the `// Opacity` comment line (around line 136) in the `interface State` block. Add after the `setOpacity` and `alignElement` lines:

```typescript
  // Generic patch helper
  updateSlot: (id: string, patch: Partial<Slot>, coalesceKey?: string) => void

  // Transform helpers
  setRotation: (id: string, deg: number) => void
  setFlip: (id: string, axis: 'H' | 'V', on: boolean) => void
  setRadius: (id: string, px: number) => void
  setStroke: (id: string, hexOrToken: string) => void
  setStrokeWidth: (id: string, px: number) => void
  setShadow: (id: string, shadow: import('./types').Shadow | null) => void
  setBlend: (id: string, mode: string) => void
```

Note: `Shadow` is imported from `../types` already via the existing `import type { Box, Design, Format, Palette, Slot, StyleOptions, TextStyle, Typography } from '../types'` — add `Shadow` to that import list.

- [ ] **Step 2.4: Add implementations inside the store's `create` return object**

Add after the `alignElement` implementation (before the closing `}` of `return {`):

```typescript
    updateSlot: (id, patch, coalesceKey) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => s.id === id ? { ...s, ...patch } : s),
      }
      commit(d, coalesceKey ? { coalesceKey } : undefined)
    },

    setRotation: (id, deg) => {
      get().updateSlot(id, { rotation: deg }, `rotation:${id}`)
    },

    setFlip: (id, axis, on) => {
      get().updateSlot(id, axis === 'H' ? { flipH: on } : { flipV: on })
    },

    setRadius: (id, px) => {
      get().updateSlot(id, { radius: px }, `radius:${id}`)
    },

    setStroke: (id, hexOrToken) => {
      get().updateSlot(id, { stroke: hexOrToken })
    },

    setStrokeWidth: (id, px) => {
      get().updateSlot(id, { strokeWidth: px }, `strokeWidth:${id}`)
    },

    setShadow: (id, shadow) => {
      get().updateSlot(id, { shadow })
    },

    setBlend: (id, mode) => {
      get().updateSlot(id, { blend: mode })
    },
```

Also update the `import type` line at the top of `src/store/useDesign.ts` to include `Shadow`:

```typescript
import type { Box, Design, Format, Palette, Shadow, Slot, StyleOptions, TextStyle, Typography } from '../types'
```

- [ ] **Step 2.5: Run store tests — confirm they pass**

```bash
pnpm vitest run src/store/useDesign.test.ts
```

Expected: all new tests PASS.

- [ ] **Step 2.6: Run full suite**

```bash
pnpm vitest run
```

Expected: 344 + 1 (types test) + ~20 (store tests) all pass.

- [ ] **Step 2.7: Commit**

```bash
git add src/types.ts src/store/useDesign.ts src/store/useDesign.test.ts
git commit -m "feat(store): add updateSlot + transform helpers (setRotation, setFlip, setRadius, setStroke, setStrokeWidth, setShadow, setBlend)"
```

---

## Task 3: Renderer — apply transforms on `<g data-slot>`

The Renderer needs to:
1. Collect shadow filters into `<defs>` with per-slot `id="shadow-${id}"`.
2. Compute center-anchored `transform` string per slot (rotation + flip).
3. Apply `filter`, `style={{ mixBlendMode, opacity }}` to each `<g>`.
4. Apply `radius` to block `<rect>` elements as `rx`/`ry`.

**Files:**
- Modify: `src/render/Renderer.tsx`
- Modify: `src/render/Renderer.test.tsx`

- [ ] **Step 3.1: Write failing Renderer tests**

Append to `src/render/Renderer.test.tsx`:

```typescript
// ── Transform: rotation ───────────────────────────────────────────────────────

test('slot with rotation:45 produces transform containing rotate(45', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.rotation = 45
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.getAttribute('transform')).toContain('rotate(45')
})

test('slot with no rotation has no transform attribute', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  delete slot.rotation
  delete slot.flipH
  delete slot.flipV
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  const t = group.getAttribute('transform')
  expect(!t || t === '' || t === 'none').toBe(true)
})

// ── Transform: flip ───────────────────────────────────────────────────────────

test('slot with flipH produces transform containing scale(-1 1)', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.flipH = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.getAttribute('transform')).toContain('scale(-1 1)')
})

test('slot with flipV produces transform containing scale(1 -1)', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.flipV = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.getAttribute('transform')).toContain('scale(1 -1)')
})

// ── Transform: shadow ─────────────────────────────────────────────────────────

test('slot with shadow adds feDropShadow filter in defs', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.shadow = { dx: 0, dy: 8, blur: 16, color: '#000000' }
  const { container } = render(<Renderer design={d} measure={measure} />)
  const filter = container.querySelector(`#shadow-${slot.id}`)
  expect(filter).toBeTruthy()
  const feDropShadow = filter!.querySelector('feDropShadow')
  expect(feDropShadow).toBeTruthy()
})

test('slot with shadow sets filter attribute on group', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.shadow = { dx: 0, dy: 8, blur: 16, color: '#000000' }
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.getAttribute('filter')).toBe(`url(#shadow-${slot.id})`)
})

test('slot without shadow has no filter attribute', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  delete slot.shadow
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.getAttribute('filter')).toBeNull()
})

// ── Transform: blend ─────────────────────────────────────────────────────────

test('slot with blend:multiply sets mix-blend-mode style on group', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  slot.blend = 'multiply'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  expect(group.style.mixBlendMode).toBe('multiply')
})

test('slot with no blend has no mix-blend-mode style', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const slot = d.slots.find(s => s.id === 'word')!
  delete slot.blend
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${slot.id}"]`) as SVGElement
  // Either no style or empty string
  const bm = group.style.mixBlendMode
  expect(!bm || bm === 'normal').toBe(true)
})

// ── Transform: block radius ───────────────────────────────────────────────────

test('block slot with radius:20 renders rect with rx="20"', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  // Add a block slot
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  blockSlot.radius = 20
  const { container } = render(<Renderer design={useDesign.getState().design} measure={measure} />)
  const rect = container.querySelector(`[data-slot="${blockSlot.id}"] rect`) as SVGRectElement
  expect(rect?.getAttribute('rx')).toBe('20')
})
```

Note: the block test imports `useDesign`. Add that import at top of Renderer.test.tsx:

```typescript
import { useDesign } from '../store/useDesign'
```

- [ ] **Step 3.2: Run Renderer tests — confirm the new tests fail**

```bash
pnpm vitest run src/render/Renderer.test.tsx
```

Expected: the new tests fail.

- [ ] **Step 3.3: Update `src/render/Renderer.tsx`**

Replace the current `Renderer.tsx` content with this updated version. Key changes are:

1. Import `Shadow` from types.
2. Add a helper function `buildTransform(box: Box, slot: Slot): string | undefined` that computes the transform.
3. Add shadow filter defs collection.
4. Update each `<g data-slot>` to carry `transform`, `filter`, and `style`.
5. Add `rx`/`ry` to block/line `<rect>` elements.

Here is the full updated `src/render/Renderer.tsx`:

```tsx
import type React from 'react'
import type { Design, Slot } from '../types'
import type { Box } from '../types'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { defaultMeasurer, type Measure } from '../lib/measure'
import { classOf } from '../design/typeclass'
import { resolveTextStyle, baselineUnit } from './resolve-style'
import { SlotImage } from './slot-image'
import { SlotText } from './slot-text'
import { orderedSlots } from '../design/order'

const GRAIN_SEED = 7

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/** Build a centered SVG transform string for rotation + flip, or undefined if none needed. */
function buildTransform(box: Box, slot: Slot): string | undefined {
  const hasRotation = slot.rotation !== undefined && slot.rotation !== 0
  const hasFlipH = !!slot.flipH
  const hasFlipV = !!slot.flipV
  if (!hasRotation && !hasFlipH && !hasFlipV) return undefined

  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const parts: string[] = []

  if (hasRotation) {
    parts.push(`rotate(${slot.rotation} ${cx} ${cy})`)
  }
  if (hasFlipH) {
    // Mirror around cx: translate to place origin at cx, scale -1, translate back
    parts.push(`translate(${2 * cx} 0) scale(-1 1)`)
  }
  if (hasFlipV) {
    // Mirror around cy
    parts.push(`translate(0 ${2 * cy}) scale(1 -1)`)
  }

  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function Renderer({ design, measure, svgRef }: {
  design: Design
  measure?: Measure
  svgRef?: React.Ref<SVGSVGElement>
}) {
  const canvas = canvasFor(design.format)
  const m = measure ?? defaultMeasurer()
  const { palette, grid, style, typography } = design

  // ---- Grid overlay lines ----
  const gridLines = (() => {
    if (!style.gridOverlay) return null
    const { cols, rows, margin, gutter } = grid
    const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
    const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows

    const vLines: number[] = []
    for (let c = 0; c < cols; c++) {
      vLines.push(margin + c * (colW + gutter))
      vLines.push(margin + c * (colW + gutter) + colW)
    }
    const vUniq = [...new Set(vLines)]

    const hLines: number[] = []
    for (let r = 0; r < rows; r++) {
      hLines.push(margin + r * (rowH + gutter))
      hLines.push(margin + r * (rowH + gutter) + rowH)
    }
    const hUniq = [...new Set(hLines)]

    return (
      <g data-grid pointerEvents="none">
        {vUniq.map((x, i) => (
          <line key={`v${i}`} x1={x} y1={0} x2={x} y2={canvas.h}
            stroke={palette.text} strokeOpacity={0.12} strokeWidth={1} />
        ))}
        {hUniq.map((y, i) => (
          <line key={`h${i}`} x1={0} y1={y} x2={canvas.w} y2={y}
            stroke={palette.text} strokeOpacity={0.12} strokeWidth={1} />
        ))}
      </g>
    )
  })()

  // ---- Collect shadow filters ----
  const slotsWithShadow = orderedSlots(design).filter(s => s.shadow)

  // ---- Resolve stroke colour token ----
  function resolveStroke(stroke: string): string {
    if (stroke === 'accent') return palette.accent
    if (stroke === 'text') return palette.text
    return stroke
  }

  return (
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${canvas.w} ${canvas.h}`}
        width="100%" height="100%"
      >
        {/* Background */}
        <rect data-bg x={0} y={0} width={canvas.w} height={canvas.h} fill={palette.bg} />

        {/* Defs: bw filter, grain filter, per-slot shadow filters */}
        <defs>
          <filter id="raster-bw">
            <feColorMatrix type="saturate" values="0" />
          </filter>
          {style.filmGrain && (
            <filter id="raster-grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves={2}
                stitchTiles="stitch"
                seed={GRAIN_SEED}
              />
            </filter>
          )}
          {slotsWithShadow.map(slot => {
            const sh = slot.shadow!
            return (
              <filter key={slot.id} id={`shadow-${slot.id}`}>
                <feDropShadow
                  dx={sh.dx}
                  dy={sh.dy}
                  stdDeviation={sh.blur / 2}
                  floodColor={sh.color}
                  floodOpacity={0.5}
                />
              </filter>
            )
          })}
        </defs>

        {/* Slots */}
        {orderedSlots(design).map(slot => {
          const box = slotBox(canvas, design.grid, slot)
          const transform = buildTransform(box, slot) || undefined
          const filterAttr = slot.shadow ? `url(#shadow-${slot.id})` : undefined
          const groupStyle: React.CSSProperties = {
            mixBlendMode: (slot.blend && slot.blend !== 'normal') ? slot.blend as React.CSSProperties['mixBlendMode'] : undefined,
            opacity: slot.opacity ?? 1,
          }

          if (slot.role === 'image') {
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: groupStyle.mixBlendMode }}
              >
                <SlotImage
                  box={box}
                  src={slot.content}
                  bw={slot.bw ?? style.bwImage}
                  radius={slot.radius}
                  stroke={slot.stroke ? resolveStroke(slot.stroke) : undefined}
                  strokeWidth={slot.strokeWidth}
                />
              </g>
            )
          }

          if (slot.role === 'block') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            const rx = slot.radius ?? 0
            const strokeColor = slot.stroke ? resolveStroke(slot.stroke) : undefined
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: groupStyle.mixBlendMode }}
              >
                <rect
                  x={box.x} y={box.y} width={box.w} height={box.h}
                  fill={fill}
                  rx={rx} ry={rx}
                  stroke={strokeColor}
                  strokeWidth={strokeColor ? (slot.strokeWidth ?? 2) : undefined}
                />
              </g>
            )
          }

          if (slot.role === 'line') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: groupStyle.mixBlendMode }}
              >
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
              </g>
            )
          }

          // Text slot
          const resolvedText = resolveTextStyle(slot, typography)
          const cls = slot.typeClass ?? classOf(slot.role)
          const color = slot.color ??
            ((style.accentHeadline && cls === 'title') ? palette.accent : palette.text)

          return (
            <g key={slot.id} data-slot={slot.id}
              opacity={slot.opacity ?? 1}
              transform={transform}
              filter={filterAttr}
              style={{ mixBlendMode: groupStyle.mixBlendMode }}
            >
              <SlotText
                id={slot.id}
                box={box}
                text={resolvedText}
                content={slot.content}
                color={color}
                measure={m}
                imageFill={slot.imageFill}
                typeClass={cls}
                baseline={baselineUnit(typography)}
              />
            </g>
          )
        })}

        {/* Grid overlay */}
        {gridLines}

        {/* Film grain */}
        {style.filmGrain && (
          <rect
            data-grain
            x={0} y={0} width={canvas.w} height={canvas.h}
            filter="url(#raster-grain)"
            opacity={0.12}
            style={{ mixBlendMode: 'overlay' }}
            pointerEvents="none"
          />
        )}
      </svg>
  )
}
```

- [ ] **Step 3.4: Run Renderer tests**

```bash
pnpm vitest run src/render/Renderer.test.tsx
```

Expected: All Renderer tests including new ones pass.

- [ ] **Step 3.5: Run full suite**

```bash
pnpm vitest run
```

Expected: All tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/render/Renderer.tsx src/render/Renderer.test.tsx
git commit -m "feat(renderer): apply rotation, flip, shadow filter, blend, block radius per slot"
```

---

## Task 4: SlotImage — radius clipPath and stroke overlay

**Files:**
- Modify: `src/render/slot-image.tsx`
- Modify: `src/render/Renderer.test.tsx` (add image-specific tests)

- [ ] **Step 4.1: Write failing image tests**

Append to `src/render/Renderer.test.tsx`:

```typescript
// ── Image radius + stroke ─────────────────────────────────────────────────────

test('image slot with radius clips via clipPath with rounded rect', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.radius = 24
  const { container } = render(<Renderer design={useDesign.getState().design} measure={measure} />)
  const clip = container.querySelector(`[data-slot="${imgSlot.id}"] clipPath rect`)
  expect(clip?.getAttribute('rx')).toBe('24')
})

test('image slot with stroke renders stroke rect on top of image', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.stroke = '#ff0000'
  imgSlot.strokeWidth = 3
  const { container } = render(<Renderer design={useDesign.getState().design} measure={measure} />)
  // Should have a rect with stroke but no fill (fill="none")
  const strokeRect = container.querySelector(`[data-slot="${imgSlot.id}"] rect[data-stroke-overlay]`)
  expect(strokeRect).toBeTruthy()
  expect(strokeRect!.getAttribute('stroke')).toBe('#ff0000')
})
```

- [ ] **Step 4.2: Run those tests — confirm they fail**

```bash
pnpm vitest run src/render/Renderer.test.tsx
```

Expected: new image tests fail.

- [ ] **Step 4.3: Update `src/render/slot-image.tsx`**

Replace with:

```tsx
import type { Box } from '../types'

interface SlotImageProps {
  box: Box
  src: string
  bw?: boolean
  radius?: number
  stroke?: string
  strokeWidth?: number
}

export function SlotImage({ box, src, bw, radius, stroke, strokeWidth }: SlotImageProps) {
  if (!src) {
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const fontSize = Math.max(13, Math.min(box.w, box.h) * 0.08)
    return (
      <g data-placeholder>
        <rect
          x={box.x} y={box.y} width={box.w} height={box.h}
          fill="#9ca3af" fillOpacity={0.12}
          stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="8 6"
          rx={radius ?? 0} ry={radius ?? 0}
        />
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="'Inter', sans-serif" fontWeight={500} fontSize={fontSize}
          letterSpacing="0.04em" fill="#9ca3af"
        >
          [ Image Here ]
        </text>
      </g>
    )
  }

  const rx = radius ?? 0
  // Use a unique clipPath id based on box coordinates (stable per render)
  const clipId = `img-clip-${box.x}-${box.y}-${box.w}-${box.h}-${rx}`
  const hasClip = rx > 0
  const sw = strokeWidth ?? 2
  const strokeInset = stroke ? sw / 2 : 0

  return (
    <g>
      {hasClip && (
        <defs>
          <clipPath id={clipId}>
            <rect
              x={box.x} y={box.y} width={box.w} height={box.h}
              rx={rx} ry={rx}
            />
          </clipPath>
        </defs>
      )}
      <image
        href={src}
        x={box.x} y={box.y} width={box.w} height={box.h}
        preserveAspectRatio="xMidYMid slice"
        filter={bw ? 'url(#raster-bw)' : undefined}
        clipPath={hasClip ? `url(#${clipId})` : undefined}
      />
      {stroke && (
        <rect
          data-stroke-overlay
          x={box.x + strokeInset}
          y={box.y + strokeInset}
          width={box.w - sw}
          height={box.h - sw}
          rx={Math.max(0, rx - strokeInset)}
          ry={Math.max(0, rx - strokeInset)}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      )}
    </g>
  )
}
```

- [ ] **Step 4.4: Run all Renderer tests**

```bash
pnpm vitest run src/render/Renderer.test.tsx
```

Expected: All pass.

- [ ] **Step 4.5: Run full suite**

```bash
pnpm vitest run
```

Expected: All pass.

- [ ] **Step 4.6: Commit**

```bash
git add src/render/slot-image.tsx src/render/Renderer.test.tsx
git commit -m "feat(renderer): image radius clipPath and stroke overlay in SlotImage"
```

---

## Task 5: ComposerRail — TRANSFORM inspector section

**Files:**
- Modify: `src/ui/ComposerRail.tsx`
- Modify: `src/ui/ComposerRail.test.tsx`

- [ ] **Step 5.1: Write failing inspector tests**

Append to `src/ui/ComposerRail.test.tsx`:

```typescript
// ── TRANSFORM section ─────────────────────────────────────────────────────────

test('selecting any element shows TRANSFORM section heading', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByText('Transform')).toBeTruthy()
})

test('TRANSFORM section shows Rotation input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Rotation')).toBeTruthy()
})

test('changing Rotation input calls setRotation', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setRotation = vi.spyOn(useDesign.getState(), 'setRotation')
  render(<ComposerRail />)
  const rotInput = screen.getByLabelText('Rotation') as HTMLInputElement
  fireEvent.change(rotInput, { target: { value: '45' } })
  expect(setRotation).toHaveBeenCalledWith(textSlot.id, 45)
})

test('TRANSFORM section shows Flip H button', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Flip horizontal')).toBeTruthy()
})

test('TRANSFORM section shows Flip V button', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Flip vertical')).toBeTruthy()
})

test('clicking Flip H calls setFlip with H', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setFlip = vi.spyOn(useDesign.getState(), 'setFlip')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Flip horizontal'))
  expect(setFlip).toHaveBeenCalledWith(textSlot.id, 'H', true)
})

test('clicking Flip V calls setFlip with V', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setFlip = vi.spyOn(useDesign.getState(), 'setFlip')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Flip vertical'))
  expect(setFlip).toHaveBeenCalledWith(textSlot.id, 'V', true)
})

test('TRANSFORM section shows Blend mode select', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Blend mode')).toBeTruthy()
})

test('changing Blend mode calls setBlend', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setBlend = vi.spyOn(useDesign.getState(), 'setBlend')
  render(<ComposerRail />)
  const blendSelect = screen.getByLabelText('Blend mode') as HTMLSelectElement
  fireEvent.change(blendSelect, { target: { value: 'multiply' } })
  expect(setBlend).toHaveBeenCalledWith(textSlot.id, 'multiply')
})

test('TRANSFORM section shows Shadow toggle', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Toggle shadow')).toBeTruthy()
})

test('enabling shadow calls setShadow with default params', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setShadow = vi.spyOn(useDesign.getState(), 'setShadow')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Toggle shadow'))
  expect(setShadow).toHaveBeenCalledWith(textSlot.id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
})

test('selecting a block element shows Corner radius input', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Corner radius')).toBeTruthy()
})

test('changing Corner radius calls setRadius', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  const setRadius = vi.spyOn(useDesign.getState(), 'setRadius')
  render(<ComposerRail />)
  const radiusInput = screen.getByLabelText('Corner radius') as HTMLInputElement
  fireEvent.change(radiusInput, { target: { value: '20' } })
  expect(setRadius).toHaveBeenCalledWith(blockSlot.id, 20)
})

test('selecting an image element shows Corner radius input', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Corner radius')).toBeTruthy()
})

test('selecting a text element does NOT show Corner radius input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.queryByLabelText('Corner radius')).toBeNull()
})

test('selecting a block element shows Stroke colour input', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Stroke colour')).toBeTruthy()
})

test('changing Stroke colour calls setStroke', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  const setStroke = vi.spyOn(useDesign.getState(), 'setStroke')
  render(<ComposerRail />)
  const strokeInput = screen.getByLabelText('Stroke colour') as HTMLInputElement
  fireEvent.change(strokeInput, { target: { value: '#ff0000' } })
  expect(setStroke).toHaveBeenCalledWith(blockSlot.id, '#ff0000')
})

test('selecting a block element shows Stroke width input', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Stroke width')).toBeTruthy()
})

test('changing Stroke width calls setStrokeWidth', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  const setStrokeWidth = vi.spyOn(useDesign.getState(), 'setStrokeWidth')
  render(<ComposerRail />)
  const swInput = screen.getByLabelText('Stroke width') as HTMLInputElement
  fireEvent.change(swInput, { target: { value: '4' } })
  expect(setStrokeWidth).toHaveBeenCalledWith(blockSlot.id, 4)
})
```

- [ ] **Step 5.2: Run ComposerRail tests — confirm new ones fail**

```bash
pnpm vitest run src/ui/ComposerRail.test.tsx
```

Expected: new TRANSFORM tests fail.

- [ ] **Step 5.3: Update `src/ui/ComposerRail.tsx` imports**

Add new Lucide icons to the import at the top of `ComposerRail.tsx`. Find the existing import line and change to:

```typescript
import {
  Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2,
  AlignLeft, AlignCenter, AlignRight, Check, Undo2, Redo2, ImageIcon, X,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  FlipHorizontal2, FlipVertical2, RotateCcw,
} from 'lucide-react'
```

- [ ] **Step 5.4: Subscribe to new store actions in `ComposerRail`**

In the `ComposerRail` function body, after the existing `const alignElement = useDesign(...)` subscriptions, add:

```typescript
  const setRotation = useDesign(s => s.setRotation)
  const setFlip = useDesign(s => s.setFlip)
  const setRadius = useDesign(s => s.setRadius)
  const setStroke = useDesign(s => s.setStroke)
  const setStrokeWidth = useDesign(s => s.setStrokeWidth)
  const setShadow = useDesign(s => s.setShadow)
  const setBlend = useDesign(s => s.setBlend)
```

- [ ] **Step 5.5: Add TRANSFORM section JSX to the inspector**

In the `selectedSlot && (() => { ... })()` IIFE inside `<div className="px-4 pb-4">`, locate the closing `{/* ALIGN */}` block and its closing `</div>`. After that closing `</div>` (still inside `<div className="space-y-3">`), add the TRANSFORM section:

```tsx
              {/* TRANSFORM */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Transform
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <label
                    htmlFor={`insp-rotation-${selectedSlot.id}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Rotation
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`insp-rotation-${selectedSlot.id}`}
                      aria-label="Rotation"
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedSlot.rotation ?? 0}
                      onChange={e => setRotation(selectedSlot.id, Number(e.target.value))}
                      className={[
                        'w-20 rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                    <span className="text-[11px] text-neutral-400">°</span>
                    <input
                      type="range"
                      aria-label="Rotation slider"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedSlot.rotation ?? 0}
                      onChange={e => setRotation(selectedSlot.id, Number(e.target.value))}
                      className="flex-1 accent-neutral-900"
                    />
                  </div>
                </div>

                {/* Flip */}
                <div className="flex gap-1">
                  <button
                    aria-label="Flip horizontal"
                    onClick={() => setFlip(selectedSlot.id, 'H', !selectedSlot.flipH)}
                    title="Flip horizontal"
                    className={[
                      'flex flex-1 items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium',
                      'active:scale-[0.97] transition-transform duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                      selectedSlot.flipH
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    <FlipHorizontal2 size={13} />
                    H
                  </button>
                  <button
                    aria-label="Flip vertical"
                    onClick={() => setFlip(selectedSlot.id, 'V', !selectedSlot.flipV)}
                    title="Flip vertical"
                    className={[
                      'flex flex-1 items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium',
                      'active:scale-[0.97] transition-transform duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                      selectedSlot.flipV
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    <FlipVertical2 size={13} />
                    V
                  </button>
                </div>

                {/* Blend */}
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={`insp-blend-${selectedSlot.id}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Blend
                  </label>
                  <select
                    id={`insp-blend-${selectedSlot.id}`}
                    aria-label="Blend mode"
                    value={selectedSlot.blend ?? 'normal'}
                    onChange={e => setBlend(selectedSlot.id, e.target.value)}
                    className={[
                      'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                      'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                    ].join(' ')}
                  >
                    {[
                      'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                      'difference', 'exclusion', 'soft-light', 'hard-light',
                    ].map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                {/* Shadow */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      Shadow
                    </span>
                    <button
                      aria-label="Toggle shadow"
                      onClick={() => {
                        if (selectedSlot.shadow) {
                          setShadow(selectedSlot.id, null)
                        } else {
                          setShadow(selectedSlot.id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
                        }
                      }}
                      className={[
                        'h-5 w-9 rounded-full border transition-colors duration-150',
                        selectedSlot.shadow
                          ? 'border-neutral-900 bg-neutral-900'
                          : 'border-neutral-300 bg-neutral-100',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150',
                          'mx-auto',
                          selectedSlot.shadow ? 'translate-x-1.5' : '-translate-x-1.5',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                  {selectedSlot.shadow && (
                    <div className="grid grid-cols-3 gap-1">
                      <NumberField
                        id={`insp-shadow-dx-${selectedSlot.id}`}
                        label="X"
                        value={selectedSlot.shadow.dx}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dx: v })}
                      />
                      <NumberField
                        id={`insp-shadow-dy-${selectedSlot.id}`}
                        label="Y"
                        value={selectedSlot.shadow.dy}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dy: v })}
                      />
                      <NumberField
                        id={`insp-shadow-blur-${selectedSlot.id}`}
                        label="Blur"
                        value={selectedSlot.shadow.blur}
                        min={0}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, blur: v })}
                      />
                      <div className="col-span-3 flex flex-col gap-0.5">
                        <label
                          htmlFor={`insp-shadow-color-${selectedSlot.id}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                        >
                          Color
                        </label>
                        <input
                          id={`insp-shadow-color-${selectedSlot.id}`}
                          type="color"
                          aria-label="Shadow colour"
                          value={selectedSlot.shadow.color}
                          onChange={e => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, color: e.target.value })}
                          className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Corner radius + stroke — block and image only */}
                {(isShape || isImage) && (
                  <div className="space-y-2">
                    <NumberField
                      id={`insp-radius-${selectedSlot.id}`}
                      label="Corner radius"
                      value={selectedSlot.radius ?? 0}
                      min={0}
                      onChange={v => setRadius(selectedSlot.id, v)}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <label
                          htmlFor={`insp-stroke-${selectedSlot.id}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                        >
                          Stroke
                        </label>
                        <input
                          id={`insp-stroke-${selectedSlot.id}`}
                          type="color"
                          aria-label="Stroke colour"
                          value={
                            selectedSlot.stroke && !['accent','text'].includes(selectedSlot.stroke)
                              ? selectedSlot.stroke
                              : design.palette.accent
                          }
                          onChange={e => setStroke(selectedSlot.id, e.target.value)}
                          className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
                        />
                      </div>
                      <NumberField
                        id={`insp-strokewidth-${selectedSlot.id}`}
                        label="Stroke width"
                        value={selectedSlot.strokeWidth ?? 0}
                        min={0}
                        onChange={v => setStrokeWidth(selectedSlot.id, v)}
                      />
                    </div>
                  </div>
                )}
              </div>
```

Note on placement: this `{/* TRANSFORM */}` block must be inside the `<div className="space-y-3">` that wraps all the inspector controls, and after `{/* ALIGN */}`.

- [ ] **Step 5.6: Run ComposerRail tests**

```bash
pnpm vitest run src/ui/ComposerRail.test.tsx
```

Expected: All ComposerRail tests pass. If a Flip H test fails because clicking the toggle button while `flipH` is falsy calls `setFlip(id, 'H', true)` — that's correct behavior. Verify by tracing: `!selectedSlot.flipH` when `flipH` is `undefined` → `!undefined` → `true`.

- [ ] **Step 5.7: Run full suite**

```bash
pnpm vitest run
```

Expected: All tests pass (344 original + new store + renderer + rail tests).

- [ ] **Step 5.8: Commit**

```bash
git add src/ui/ComposerRail.tsx src/ui/ComposerRail.test.tsx
git commit -m "feat(inspector): TRANSFORM section — rotation, flip, blend, shadow, radius, stroke"
```

---

## Task 6: TypeScript build check + final green run

**Files:** None modified. Verification only.

- [ ] **Step 6.1: Run full test suite**

```bash
pnpm vitest run
```

Expected: All tests pass, zero failures.

- [ ] **Step 6.2: Run TypeScript build**

```bash
pnpm build
```

Expected: Clean build with no TypeScript errors. Watch for:
- `Shadow` type imported correctly in both `useDesign.ts` and wherever used.
- `mixBlendMode` cast to `React.CSSProperties['mixBlendMode']` avoids TS error.
- `SlotImage` props match both the interface and all call sites in `Renderer.tsx`.

- [ ] **Step 6.3: If build has errors, fix them**

Common issues to anticipate:

**Issue A:** `setShadow` argument type. The `State` interface has `setShadow: (id: string, shadow: Shadow | null) => void` but it references `import('./types').Shadow`. Fix by having it inline in the interface or ensuring `Shadow` is in the top-level import in `useDesign.ts`.

Correct import line in `useDesign.ts`:
```typescript
import type { Box, Design, Format, Palette, Shadow, Slot, StyleOptions, TextStyle, Typography } from '../types'
```

And in State interface:
```typescript
setShadow: (id: string, shadow: Shadow | null) => void
```

**Issue B:** `mixBlendMode` on SVG `<g>` is typed as `React.CSSProperties['mixBlendMode']` which is `string | undefined`, but an arbitrary string may fail strict checks. Use a cast:
```typescript
style={{ mixBlendMode: (slot.blend && slot.blend !== 'normal') ? slot.blend as React.CSSProperties['mixBlendMode'] : undefined }}
```

**Issue C:** `transform` prop on SVG `<g>` — React 19 accepts `transform?: string` on SVG elements natively. No issue expected.

- [ ] **Step 6.4: Final commit if build fixes were needed**

```bash
git add -A
git commit -m "fix(types): resolve TypeScript strict errors in transform pack"
```

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| `rotation?: number` on Slot | Task 1 |
| `flipH?: boolean`, `flipV?: boolean` | Task 1 |
| `radius?: number` | Task 1 |
| `stroke?: string`, `strokeWidth?: number` | Task 1 |
| `shadow?: Shadow \| null` | Task 1 |
| `blend?: string` | Task 1 |
| Generic `updateSlot(id, patch, coalesceKey?)` | Task 2 |
| `setRotation` coalescing `rotation:${id}` | Task 2 |
| `setFlip(id, axis, on)` | Task 2 |
| `setRadius` coalescing | Task 2 |
| `setStroke`, `setStrokeWidth` coalescing | Task 2 |
| `setShadow(id, shadow\|null)` | Task 2 |
| `setBlend(id, mode)` | Task 2 |
| Renderer: `rotate(deg cx cy)` centered | Task 3 |
| Renderer: flipH = `translate(2*cx 0) scale(-1 1)` | Task 3 |
| Renderer: flipV = `translate(0 2*cy) scale(1 -1)` | Task 3 |
| Renderer: shadow filter + `filter` attr on group | Task 3 |
| Renderer: `mix-blend-mode` on group style | Task 3 |
| Renderer: block `<rect rx ry>` for radius | Task 3 |
| Renderer: image rounded via clipPath | Task 4 |
| Renderer: image stroke overlay rect | Task 4 |
| Renderer: resolve stroke token 'accent'/'text' | Task 3 |
| Renderer: existing opacity/bw/grain/grid not regressed | Task 3 (existing tests still pass) |
| Inspector: TRANSFORM section | Task 5 |
| Inspector: Rotation number + slider | Task 5 |
| Inspector: Flip H/V toggle buttons with icons | Task 5 |
| Inspector: Blend mode select (10 modes) | Task 5 |
| Inspector: Shadow toggle + dx/dy/blur/color | Task 5 |
| Inspector: Corner radius (block + image only) | Task 5 |
| Inspector: Stroke colour + width (block + image only) | Task 5 |
| Migration safety (optional fields, `?? ` fallbacks) | Fields are optional; `buildTransform` early-returns; Renderer uses `?? 0` and `?? undefined` |
| `load()` migration not needed | Optional fields are backward compatible |
| Tests: store patches + undoable | Task 2 |
| Tests: coalescing behavior | Task 2 |
| Tests: renderer transform/shadow/radius/blend | Tasks 3-4 |
| Tests: inspector controls call correct actions | Task 5 |
| `pnpm vitest run` green | Task 6 |
| `pnpm build` clean | Task 6 |

### Placeholder scan

No TBDs, no "implement later", no "similar to Task N" — all code is complete and literal.

### Type consistency

- `Shadow` interface: defined in `src/types.ts`, imported in `useDesign.ts`, passed as `shadow?: Shadow | null` in `Slot`.
- `updateSlot(id: string, patch: Partial<Slot>, coalesceKey?: string)` — used consistently across all helper implementations.
- `SlotImage` props: `{ box, src, bw, radius, stroke, strokeWidth }` — Renderer calls match the interface exactly.
- `setFlip(id, 'H', bool)` in tests and in JSX both use `'H'` and `'V'` string literals.
- `setShadow(id, shadow | null)` — toggle passes `{ dx: 0, dy: 8, blur: 16, color: '#000000' }` and `null`. Tests verify same default.

# Opacity, Alignment Tools, and Center-Snap Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-element opacity, six-edge canvas-alignment buttons, and center-snap guides during drag to Raster's editor.

**Architecture:** Three orthogonal changes: (1) `opacity` field on `Slot` type + `setOpacity`/`alignElement` actions in the Zustand store; (2) opacity slider + alignment buttons in the "All elements" section of `ComposerRail` inspector; (3) center-snap guide overlay drawn inside `ComposerOverlay` during a MOVE drag. Each change is additive with no regressions to existing behavior.

**Tech Stack:** TypeScript (strict), React 19, Zustand 5, Vitest 4 + Testing Library 16, Tailwind CSS 4, lucide-react 1.18 (icons: `AlignStartVertical`, `AlignCenterVertical`, `AlignEndVertical`, `AlignStartHorizontal`, `AlignCenterHorizontal`, `AlignEndHorizontal`).

**BASE_SHA:** `914be11814e39f791b97599c8ae0538520f6695a`

---

## File Map

| File | Change |
|------|--------|
| `src/types.ts` | Add `opacity?: number` to `Slot` interface |
| `src/store/useDesign.ts` | Add `setOpacity` and `alignElement` actions to State interface and implementation |
| `src/render/Renderer.tsx` | Apply `opacity` attribute to each `<g data-slot>` group |
| `src/ui/ComposerRail.tsx` | Add OPACITY slider and ALIGN buttons in "All elements" (position & size section); add new store action imports |
| `src/ui/ComposerOverlay.tsx` | Add center-snap detection inside `startMove`; render guide lines in the overlay |
| `src/store/useDesign.test.ts` | Tests for `setOpacity` and `alignElement` |
| `src/render/Renderer.test.tsx` | Test that opacity is applied to `<g data-slot>` |
| `src/ui/ComposerRail.test.tsx` | Tests for OPACITY slider and ALIGN buttons |
| `src/ui/ComposerOverlay.test.tsx` | Light smoke test for center-snap guides |

---

## Task 1: Add `opacity` to the `Slot` type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the field**

In `src/types.ts`, add `opacity?: number` to the `Slot` interface after `bw?`:

```typescript
/** Per-element opacity (0..1). Default is 1 when unset. */
opacity?: number
```

The full `Slot` interface after the edit (relevant section):
```typescript
export interface Slot {
  id: string
  role: SlotRole
  cell: GridCell
  box?: Box
  content: string
  text?: TextStyle
  fill?: string
  typeClass?: 'title' | 'headline' | 'body'
  z?: number
  overridden?: string[]
  color?: string
  bw?: boolean
  imageFill?: string
  /** Per-element opacity (0..1). Default is 1 when unset. */
  opacity?: number
}
```

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: all 313 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/types.ts && git commit -m "feat(types): add optional opacity field to Slot"
```

---

## Task 2: Store actions — `setOpacity` and `alignElement`

**Files:**
- Modify: `src/store/useDesign.ts`

- [ ] **Step 1: Write the failing tests**

Append to `/Users/mymac/Documents/Work/raster/src/store/useDesign.test.ts`:

```typescript
// ── setOpacity ────────────────────────────────────────────────────────────────

test('setOpacity sets opacity on a slot (clamped 0..1)', () => {
  useDesign.getState().setOpacity('word', 0.5)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(0.5)
})

test('setOpacity clamps below 0 to 0', () => {
  useDesign.getState().setOpacity('word', -0.1)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(0)
})

test('setOpacity clamps above 1 to 1', () => {
  useDesign.getState().setOpacity('word', 1.5)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(1)
})

test('setOpacity coalesces consecutive calls into one undo step', () => {
  useDesign.getState().setOpacity('word', 0.3)
  useDesign.getState().setOpacity('word', 0.6)
  useDesign.getState().setOpacity('word', 0.9)
  // Only one past entry (the state BEFORE the first setOpacity)
  expect(useDesign.getState().past.length).toBe(1)
})

test('setOpacity is undoable', () => {
  useDesign.getState().setOpacity('word', 0.3)
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBeUndefined()
})

// ── alignElement ──────────────────────────────────────────────────────────────

test('alignElement left: sets x to margin', () => {
  // mega-word '4:5' canvas: 1080x1350, default margin: 64
  // word slot has no box, so we give it one
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'left')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.x).toBe(64) // margin
  expect(slot.box!.y).toBe(200) // unchanged
  expect(slot.box!.w).toBe(400)
  expect(slot.box!.h).toBe(150)
})

test('alignElement right: sets x to C.w - margin - box.w', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'right')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // 1080 - 64 - 400 = 616
  expect(slot.box!.x).toBe(616)
  expect(slot.box!.y).toBe(200) // unchanged
})

test('alignElement centerH: centers box horizontally', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'centerH')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1080 - 400) / 2 = 340
  expect(slot.box!.x).toBe(340)
  expect(slot.box!.y).toBe(200) // unchanged
})

test('alignElement top: sets y to margin', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'top')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.y).toBe(64) // margin
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement bottom: sets y to C.h - margin - box.h', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'bottom')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // 1350 - 64 - 150 = 1136
  expect(slot.box!.y).toBe(1136)
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement centerV: centers box vertically', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'centerV')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1350 - 150) / 2 = 600
  expect(slot.box!.y).toBe(600)
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement is undoable', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  const beforeX = useDesign.getState().design.slots.find(s => s.id === 'word')!.box!.x
  useDesign.getState().alignElement('word', 'left')
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.x).toBe(beforeX)
})

test('alignElement result values are rounded to integers', () => {
  // Use a w that produces fractional center
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 401, h: 151 })
  useDesign.getState().alignElement('word', 'centerH')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1080 - 401) / 2 = 339.5 → rounded to 340
  expect(Number.isInteger(slot.box!.x)).toBe(true)
})
```

- [ ] **Step 2: Run failing tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/store/useDesign.test.ts 2>&1 | tail -30
```

Expected: failures like `TypeError: useDesign.getState().setOpacity is not a function`.

- [ ] **Step 3: Add `setOpacity` and `alignElement` to the State interface**

In `src/store/useDesign.ts`, add to the `State` interface (after `resetElement`):

```typescript
// Opacity
setOpacity: (slotId: string, value: number) => void

// Alignment
alignElement: (slotId: string, edge: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
```

- [ ] **Step 4: Implement `setOpacity` in the store's `return` block**

Add after `resetElement` implementation:

```typescript
setOpacity: (slotId, value) => {
  const clamped = Math.min(1, Math.max(0, value))
  const d = {
    ...get().design,
    slots: get().design.slots.map(s =>
      s.id === slotId ? { ...s, opacity: clamped } : s
    ),
  }
  commit(d, { coalesceKey: `opacity:${slotId}` })
},
```

- [ ] **Step 5: Implement `alignElement` in the store's `return` block**

Add after `setOpacity` implementation. This requires importing `slotBox` and `canvasFor` (already imported in the file — verify the import at the top of `useDesign.ts`; `canvasFor` is already imported; `slotBox` needs to be added):

At the top of `src/store/useDesign.ts`, in the imports section, add `slotBox`:
```typescript
import { slotBox } from '../lib/grid'
```

Then the implementation:

```typescript
alignElement: (slotId, edge) => {
  const design = get().design
  const slot = design.slots.find(s => s.id === slotId)
  if (!slot) return
  const canvas = canvasFor(design.format)
  const M = design.grid.margin
  const box = slotBox(canvas, design.grid, slot)

  let newX = box.x
  let newY = box.y

  switch (edge) {
    case 'left':    newX = M; break
    case 'right':   newX = canvas.w - M - box.w; break
    case 'centerH': newX = (canvas.w - box.w) / 2; break
    case 'top':     newY = M; break
    case 'bottom':  newY = canvas.h - M - box.h; break
    case 'centerV': newY = (canvas.h - box.h) / 2; break
  }

  const newBox = {
    x: Math.round(newX),
    y: Math.round(newY),
    w: Math.round(box.w),
    h: Math.round(box.h),
  }

  const d = {
    ...design,
    slots: design.slots.map(s => s.id === slotId ? { ...s, box: newBox } : s),
  }
  commit(d)
},
```

- [ ] **Step 6: Run the tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/store/useDesign.test.ts 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 7: Run the full suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -20
```

Expected: all 313+ tests pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/store/useDesign.ts src/store/useDesign.test.ts && git commit -m "feat(store): add setOpacity and alignElement actions"
```

---

## Task 3: Renderer — apply opacity to `<g data-slot>`

**Files:**
- Modify: `src/render/Renderer.tsx`
- Modify: `src/render/Renderer.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/render/Renderer.test.tsx`:

```typescript
test('slot with opacity:0.5 renders <g data-slot> with opacity attribute', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.opacity = 0.5
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${wordSlot.id}"]`) as SVGElement
  expect(group).toBeTruthy()
  expect(group.getAttribute('opacity')).toBe('0.5')
})

test('slot with no opacity renders <g data-slot> with opacity 1 (default)', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const wordSlot = d.slots.find(s => s.id === 'word')!
  delete wordSlot.opacity
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${wordSlot.id}"]`) as SVGElement
  expect(group).toBeTruthy()
  // Either no attribute or "1" — both are equivalent
  const opacityAttr = group.getAttribute('opacity')
  expect(opacityAttr === null || opacityAttr === '1').toBe(true)
})
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/render/Renderer.test.tsx 2>&1 | tail -20
```

Expected: `slot with opacity:0.5` fails — `opacity` attribute is null.

- [ ] **Step 3: Apply opacity to every `<g data-slot>` in Renderer**

In `src/render/Renderer.tsx`, every slot branch renders `<g key={slot.id} data-slot={slot.id}>`. Add `opacity={slot.opacity ?? 1}` to each one.

The four branches to update (image, block, line, text):

```tsx
// image branch
return (
  <g key={slot.id} data-slot={slot.id} opacity={slot.opacity ?? 1}>
    <SlotImage box={box} src={slot.content} bw={slot.bw ?? style.bwImage} />
  </g>
)

// block branch
return (
  <g key={slot.id} data-slot={slot.id} opacity={slot.opacity ?? 1}>
    <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
  </g>
)

// line branch
return (
  <g key={slot.id} data-slot={slot.id} opacity={slot.opacity ?? 1}>
    <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
  </g>
)

// text branch
return (
  <g key={slot.id} data-slot={slot.id} opacity={slot.opacity ?? 1}>
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
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/render/Renderer.test.tsx 2>&1 | tail -20
```

Expected: all Renderer tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/render/Renderer.tsx src/render/Renderer.test.tsx && git commit -m "feat(renderer): apply per-element opacity to <g data-slot>"
```

---

## Task 4: ComposerRail — OPACITY slider and ALIGN buttons

**Files:**
- Modify: `src/ui/ComposerRail.tsx`
- Modify: `src/ui/ComposerRail.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/ComposerRail.test.tsx`:

```typescript
// ── Opacity slider ─────────────────────────────────────────────────────────────

test('selecting any element shows the OPACITY slider', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Opacity')).toBeTruthy()
})

test('OPACITY slider reflects current slot opacity (default 100)', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  const slider = screen.getByLabelText('Opacity') as HTMLInputElement
  // Default is 1 (unset), so 100%
  expect(Number(slider.value)).toBe(100)
})

test('moving OPACITY slider calls setOpacity with value/100', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setOpacity = vi.spyOn(useDesign.getState(), 'setOpacity')
  render(<ComposerRail />)
  const slider = screen.getByLabelText('Opacity') as HTMLInputElement
  fireEvent.change(slider, { target: { value: '50' } })
  expect(setOpacity).toHaveBeenCalledWith(textSlot.id, 0.5)
})

test('OPACITY slider works for image elements too', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Opacity')).toBeTruthy()
})

test('OPACITY display shows rounded percentage value', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().setOpacity(textSlot.id, 0.75)
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  // Should show "75%" somewhere
  expect(screen.getByText('75%')).toBeTruthy()
})

// ── Alignment buttons ──────────────────────────────────────────────────────────

test('selecting any element shows the 6 ALIGN buttons', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Align left')).toBeTruthy()
  expect(screen.getByLabelText('Align center horizontal')).toBeTruthy()
  expect(screen.getByLabelText('Align right')).toBeTruthy()
  expect(screen.getByLabelText('Align top')).toBeTruthy()
  expect(screen.getByLabelText('Align center vertical')).toBeTruthy()
  expect(screen.getByLabelText('Align bottom')).toBeTruthy()
})

test('clicking Align left calls alignElement with edge:left', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align left'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'left')
})

test('clicking Align center horizontal calls alignElement with edge:centerH', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align center horizontal'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'centerH')
})

test('clicking Align right calls alignElement with edge:right', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align right'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'right')
})

test('clicking Align top calls alignElement with edge:top', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align top'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'top')
})

test('clicking Align center vertical calls alignElement with edge:centerV', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align center vertical'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'centerV')
})

test('clicking Align bottom calls alignElement with edge:bottom', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const alignElement = vi.spyOn(useDesign.getState(), 'alignElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align bottom'))
  expect(alignElement).toHaveBeenCalledWith(textSlot.id, 'bottom')
})

test('ALIGN buttons appear for image element too', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Align left')).toBeTruthy()
})

test('ALIGN buttons appear for shape element too', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Align left')).toBeTruthy()
})
```

- [ ] **Step 2: Run failing tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerRail.test.tsx 2>&1 | tail -30
```

Expected: all new tests fail — `setOpacity`, `alignElement`, OPACITY slider and ALIGN buttons not found.

- [ ] **Step 3: Update ComposerRail.tsx imports**

At the top of `src/ui/ComposerRail.tsx`:

1. Add new lucide icons to the existing import line. Change:
```tsx
import { Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Check, Undo2, Redo2, ImageIcon, X } from 'lucide-react'
```
To:
```tsx
import { Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Check, Undo2, Redo2, ImageIcon, X, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react'
```

- [ ] **Step 4: Add store action subscriptions in ComposerRail**

Inside the `ComposerRail` function body, after the existing store subscriptions (after `setImageFill`, `clearImageFill`, etc.), add:

```tsx
const setOpacity = useDesign(s => s.setOpacity)
const alignElement = useDesign(s => s.alignElement)
```

- [ ] **Step 5: Add OPACITY row in the inspector "All elements" section**

In `ComposerRail.tsx`, the "Position & Size" section is inside `{selectedSlot && (() => { ... })()}` near the bottom of the `div.space-y-3`. Find the `{/* Position & Size */}` block:

```tsx
{/* Position & Size */}
{resolvedBox && (
  <div className="space-y-1.5">
    ...
  </div>
)}
```

**Before** the `{/* Position & Size */}` block (and after the per-type controls that follow `isShape && ...`), insert the OPACITY and ALIGN rows. These are "All elements" controls so they go unconditionally (when `selectedSlot` is set and `resolvedBox` exists — actually they can go just after the per-type section and before or after Position & Size; put them after Position & Size for visual grouping):

Replace the closing of the `{/* Position & Size */}` section so the new controls appear **after** Position & Size and before the `</div>` that closes `className="space-y-3"`:

```tsx
{/* OPACITY */}
{resolvedBox && (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        Opacity
      </span>
      <span className="text-[10px] tabular-nums text-neutral-500 font-medium">
        {Math.round((selectedSlot.opacity ?? 1) * 100)}%
      </span>
    </div>
    <input
      type="range"
      aria-label="Opacity"
      min={0}
      max={100}
      step={1}
      value={Math.round((selectedSlot.opacity ?? 1) * 100)}
      onChange={e => setOpacity(selectedSlot.id, Number(e.target.value) / 100)}
      className="w-full accent-neutral-900"
    />
  </div>
)}

{/* ALIGN */}
{resolvedBox && (
  <div className="space-y-1.5">
    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
      Align
    </div>
    <div className="flex gap-1">
      {[
        { edge: 'left' as const,    label: 'Align left',              Icon: AlignStartVertical },
        { edge: 'centerH' as const, label: 'Align center horizontal', Icon: AlignCenterVertical },
        { edge: 'right' as const,   label: 'Align right',             Icon: AlignEndVertical },
        { edge: 'top' as const,     label: 'Align top',               Icon: AlignStartHorizontal },
        { edge: 'centerV' as const, label: 'Align center vertical',   Icon: AlignCenterHorizontal },
        { edge: 'bottom' as const,  label: 'Align bottom',            Icon: AlignEndHorizontal },
      ].map(({ edge, label, Icon }) => (
        <button
          key={edge}
          aria-label={label}
          onClick={() => alignElement(selectedSlot.id, edge)}
          className={[
            'flex-1 flex items-center justify-center rounded border border-neutral-200 py-1.5',
            'text-neutral-500 hover:border-neutral-400 hover:text-neutral-900',
            'active:scale-[0.97] transition-transform duration-150',
            '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          ].join(' ')}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  </div>
)}
```

**Important:** Place the OPACITY block first, then ALIGN, both inside the `selectedSlot && (...)` IIFE's `div.space-y-3`, after the `{/* Position & Size */}` block.

- [ ] **Step 6: Run ComposerRail tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerRail.test.tsx 2>&1 | tail -30
```

Expected: all tests pass — both old and new.

- [ ] **Step 7: Note on `aria-label` collision**

There is already an "Align left/center/right" in the text alignment controls (the text `<InspectorRow label="Align">` section for text slots). The new "Align left" button has a different `aria-label` = "Align left" — which is the same as the existing text align button. **If this causes test failures** (multiple elements with same label), rename the new align buttons to "Canvas align left", "Canvas align center horizontal", etc. and update the test `aria-label` strings accordingly. Verify by checking the existing test:

```bash
cd /Users/mymac/Documents/Work/raster && grep -n "Align left" src/ui/ComposerRail.test.tsx
```

If line 99 and the new test both use `"Align left"`, distinguish them. For text alignment row it uses:
- `aria-label="Align left"` (line 625 in ComposerRail.tsx)

To avoid collision, make the canvas-alignment buttons use these labels:
- `"Align left"` → only collides when a text element is selected AND both sets appear. Since the ALIGN row appears for all selected elements, and text also has its own "Align" row, there WILL be collision for text elements.

**Resolution:** Use a `data-canvas-align` attribute on the new buttons and update tests to use `container.querySelector('[data-canvas-align="left"]')` instead of `screen.getByLabelText`. Or — simpler — keep the `aria-label` distinct by changing to `"Canvas align left"`, `"Canvas align center horizontal"`, etc. Update the aria-labels in both implementation and tests.

The test titles say `aria-label` strings like `'Align left'`, `'Align center horizontal'` etc. Use these exact strings in the buttons but verify via `container.querySelector('[aria-label="Align left"]')` — and note that `screen.getByLabelText` will throw if there are multiple. Use `screen.getAllByLabelText` or target via data attribute.

**Safest approach:** Give each canvas-align button a `data-canvas-align={edge}` attribute and a unique `aria-label`:
- `aria-label="Canvas align left"`, data attr `data-canvas-align="left"`
- etc.

Update tests accordingly (use `'Canvas align left'` not `'Align left'`).

- [ ] **Step 8: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/ComposerRail.tsx src/ui/ComposerRail.test.tsx && git commit -m "feat(rail): add OPACITY slider and canvas ALIGN buttons to inspector"
```

---

## Task 5: ComposerOverlay — center-snap guides during move drag

**Files:**
- Modify: `src/ui/ComposerOverlay.tsx`
- Modify: `src/ui/ComposerOverlay.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/ui/ComposerOverlay.test.tsx`:

```typescript
// ── Center-snap guides ─────────────────────────────────────────────────────────

test('center-snap guide elements are not visible before any drag', () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  expect(container.querySelector('[data-center-guide-x]')).toBeNull()
  expect(container.querySelector('[data-center-guide-y]')).toBeNull()
})

test('ComposerOverlay renders without crash when center-snap code is present', () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const overlay = container.querySelector('[data-composer-overlay]')
  expect(overlay).toBeTruthy()
})
```

- [ ] **Step 2: Run failing tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerOverlay.test.tsx 2>&1 | tail -20
```

Expected: the `[data-center-guide-x]` and `[data-center-guide-y]` tests fail (elements don't exist yet since they're absent before drag — actually they will pass since elements don't exist yet). The tests will PASS trivially. That's fine — they ensure no crash and that guides aren't present at rest.

- [ ] **Step 3: Add center-snap state and logic to ComposerOverlay**

In `src/ui/ComposerOverlay.tsx`:

**a) Add the SNAP_PX constant** near the top after `SNAP_THRESHOLD`:

```typescript
/** Center-snap threshold in screen pixels — converted to canvas units on use */
const CENTER_SNAP_PX = 8
```

**b) Add state for snap guides** inside the `ComposerOverlay` function (after the existing `useState` calls):

```typescript
const [centerGuides, setCenterGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false })
```

**c) Update `startMove`** to detect center snapping and set guide state. Replace the existing `startMove` function entirely:

```typescript
function startMove(slot: Slot, e: React.PointerEvent) {
  e.stopPropagation()
  e.preventDefault()

  const startBox = slotBox(canvas, design.grid, slot)
  const startX = e.clientX
  const startY = e.clientY
  const centerSnapThreshold = CENTER_SNAP_PX / safeScale

  const move = (ev: PointerEvent) => {
    const rawDx = (ev.clientX - startX) / safeScale
    const rawDy = (ev.clientY - startY) / safeScale

    let dx = rawDx
    let dy = rawDy

    // Axis lock when Shift
    if (ev.shiftKey) {
      if (Math.abs(rawDx) >= Math.abs(rawDy)) dy = 0
      else dx = 0
    }

    let newX = startBox.x + dx
    let newY = startBox.y + dy

    // Grid snap
    if (snap) {
      newX = snapToNearest(newX, boundaries.xs, SNAP_THRESHOLD)
      newY = snapToNearest(newY, boundaries.ys, SNAP_THRESHOLD)
    }

    // Center-snap: check dragged element center vs canvas center
    const elCenterX = newX + startBox.w / 2
    const elCenterY = newY + startBox.h / 2
    const canvasCenterX = canvas.w / 2
    const canvasCenterY = canvas.h / 2

    let snapX = false
    let snapY = false

    if (Math.abs(elCenterX - canvasCenterX) < centerSnapThreshold) {
      newX = canvasCenterX - startBox.w / 2
      snapX = true
    }

    if (Math.abs(elCenterY - canvasCenterY) < centerSnapThreshold) {
      newY = canvasCenterY - startBox.h / 2
      snapY = true
    }

    setCenterGuides({ x: snapX, y: snapY })
    setBox(slot.id, { ...startBox, x: newX, y: newY })
  }

  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    setCenterGuides({ x: false, y: false })
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
```

**d) Render the guide lines** inside the overlay `return`, after the `{slots.map(...)}` block and before the closing `</div>`. The guides must be drawn in the overlay's coordinate space (canvas units, already scaled by the overlay's CSS transform):

```tsx
{/* Center-snap guide lines — only visible during active snapped drag */}
{centerGuides.x && (
  <div
    data-center-guide-x
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: canvas.w / 2,
      top: 0,
      width: 1 / safeScale,
      height: canvas.h,
      background: '#3b82f6',
      opacity: 0.6,
      pointerEvents: 'none',
    }}
  />
)}
{centerGuides.y && (
  <div
    data-center-guide-y
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: 0,
      top: canvas.h / 2,
      width: canvas.w,
      height: 1 / safeScale,
      background: '#3b82f6',
      opacity: 0.6,
      pointerEvents: 'none',
    }}
  />
)}
```

- [ ] **Step 4: Run ComposerOverlay tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerOverlay.test.tsx 2>&1 | tail -20
```

Expected: all tests pass, including the two new guide tests.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/ComposerOverlay.tsx src/ui/ComposerOverlay.test.tsx && git commit -m "feat(overlay): center-snap guides during element move drag"
```

---

## Task 6: TypeScript build check

**Files:** None (build validation only)

- [ ] **Step 1: Run the build**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -30
```

Expected: `Build complete` (or equivalent Vite/tsc success output) — no TypeScript errors.

- [ ] **Step 2: Fix any TS errors**

Common issues to watch for:
- `setOpacity` and `alignElement` must be in the `State` interface in `useDesign.ts`
- The import of `slotBox` must be present in `useDesign.ts`
- `opacity` on SVG `<g>` elements: TypeScript SVG types accept `opacity` as a number attribute on `<g>` — pass it as `opacity={slot.opacity ?? 1}` (number, not string).
- The `AlignStartVertical` etc. imports must match exactly what lucide-react exports — verified in pre-plan check (they exist in lucide-react 1.18.0).

- [ ] **Step 3: Commit any fixes**

```bash
cd /Users/mymac/Documents/Work/raster && git add -p && git commit -m "fix(ts): resolve type errors from opacity and alignment additions"
```

(Only needed if fixes were required.)

---

## Task 7: Final integration check

- [ ] **Step 1: Run complete test suite one final time**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -30
```

Expected: all 313+ tests pass.

- [ ] **Step 2: Log commit SHAs**

```bash
cd /Users/mymac/Documents/Work/raster && git log --oneline -6
```

Report: BASE_SHA, each feature commit SHA, test count, build status.

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| `Slot.opacity?: number` | Task 1 |
| `setOpacity` — clamp, coalesce `opacity:${id}` | Task 2 |
| Renderer: `opacity` on `<g data-slot>` | Task 3 |
| Inspector OPACITY row — slider 0–100%, tabular-nums % display | Task 4 |
| `alignElement` for 6 edges, uses `slotBox`+`canvasFor`, rounds, undo | Task 2 |
| Inspector ALIGN row — 6 icon buttons, aria-labels | Task 4 |
| Center-snap guides in ComposerOverlay during move | Task 5 |
| Guide lines: 1px/scale, #3b82f6, only during drag+snapped | Task 5 |
| Guide removed on pointerup | Task 5 |
| Tests: `setOpacity` clamps + coalesces + undoable | Task 2 |
| Tests: `alignElement` 6 edges + undo + integer round | Task 2 |
| Tests: Renderer opacity attribute | Task 3 |
| Tests: ComposerRail opacity slider + align buttons | Task 4 |
| Tests: ComposerOverlay guides no-crash smoke | Task 5 |
| `pnpm vitest run` all green | Task 7 |
| `pnpm build` clean | Task 6 |

### Placeholder Scan

No TBDs, TODOs, or "implement later" — all code is explicit in every step.

### Type Consistency

- `alignElement(slotId: string, edge: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom')` — consistent across State interface, implementation, and ComposerRail calls.
- `setOpacity(slotId: string, value: number)` — consistent across State interface, implementation (clamps to 0..1), and ComposerRail call (passes `value / 100`).
- `slot.opacity ?? 1` — used in Renderer and ComposerRail display, consistent (undefined → 1).
- `slotBox` imported from `'../lib/grid'` in both `useDesign.ts` and existing `ComposerOverlay.tsx` / `ComposerRail.tsx`.

### Aria-label Collision Warning

In Task 4 Step 7, the note about collision between text-alignment "Align left" and canvas-alignment "Align left" must be resolved. The safest implementation uses `aria-label="Canvas align left"` etc. for the new canvas-align buttons, with matching test strings. The plan's test code uses `'Canvas align left'` style — ensure the implementation in ComposerRail.tsx uses the same labels.

**Final canonical aria-labels for canvas-align buttons:**
- `"Canvas align left"`, `"Canvas align center horizontal"`, `"Canvas align right"`
- `"Canvas align top"`, `"Canvas align center vertical"`, `"Canvas align bottom"`

Update both the ComposerRail.tsx button `aria-label` props and the ComposerRail.test.tsx assertions to use these exact strings.

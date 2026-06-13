# Per-Element Overrides + Full Element Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-element override fields to `Slot` so that individual elements can override global typography/style settings, and replace the thin "Selected" panel in `ComposerRail` with a rich PROPERTIES inspector that exposes all relevant controls per element type.

**Architecture:** (1) Extend `Slot` type with `overridden`, `color`, and `bw` fields. (2) Update `resolveTextStyle` to respect overrides. (3) Update `Renderer`/`ComposerOverlay` color + bw rendering to use per-slot values. (4) Add four new store actions (`overrideText`, `setColor`, `setBw`, `resetElement`). (5) Replace the slim selected-panel in `ComposerRail` with a full scrollable inspector. (6) Update all affected tests.

**Tech Stack:** TypeScript (strict), React 19, Zustand 5, lucide-react, Vitest + @testing-library/react, pnpm 11.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `overridden`, `color`, `bw` to `Slot` |
| `src/render/resolve-style.ts` | Modify | Override-aware field resolution |
| `src/render/Renderer.tsx` | Modify | Per-slot color + bw |
| `src/ui/ComposerOverlay.tsx` | Modify | `slotColor` uses `slot.color` first |
| `src/store/useDesign.ts` | Modify | Add `overrideText`, `setColor`, `setBw`, `resetElement` to `State` + implementation |
| `src/ui/ComposerRail.tsx` | Modify | Rich inspector (NumberField, InspectorRow helpers + full inspector per type) |
| `src/ui/sidebar/TypographyControls.tsx` | Modify | Add "Global defaults" hint |
| `src/ui/sidebar/StyleControls.tsx` | Modify | Add "Global defaults" hint |
| `src/render/resolve-style.test.ts` | Modify | Override-aware test cases |
| `src/render/Renderer.test.tsx` | Modify | Per-slot color and bw override tests |
| `src/store/useDesign.test.ts` | Modify | Tests for new store actions |
| `src/ui/ComposerRail.test.tsx` | Modify | Rich inspector rendering tests |

---

## Task 1: Extend `Slot` type with override fields

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `overridden`, `color`, and `bw` to the `Slot` interface**

Open `src/types.ts`. After the existing `z?: number` field, add:

```ts
export interface Slot {
  id: string
  role: SlotRole
  cell: GridCell
  /** free-mode absolute override; when set, used instead of cell. */
  box?: Box
  content: string
  text?: TextStyle
  fill?: string
  typeClass?: 'title' | 'headline' | 'body'
  /** Z-order for rendering; fallback = array index. */
  z?: number
  /**
   * Names of TextStyle fields that have been explicitly overridden for this
   * element (e.g. ['size', 'family']). When a field name is in this list,
   * resolveTextStyle uses slot.text[field] instead of the global typography value.
   */
  overridden?: string[]
  /** Per-element text colour override (hex). Overrides palette.text / accent logic. */
  color?: string
  /** Per-element B&W override for image slots. Overrides style.bwImage when set. */
  bw?: boolean
}
```

- [ ] **Step 2: Run the TypeScript compiler to confirm no errors from the type change alone**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (new optional fields are backward-compatible).

- [ ] **Step 3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/types.ts
git commit -m "feat(types): add overridden, color, bw per-element override fields to Slot"
```

---

## Task 2: Update `resolveTextStyle` to respect `slot.overridden`

**Files:**
- Modify: `src/render/resolve-style.ts`
- Modify: `src/render/resolve-style.test.ts`

### Background

Currently `resolveTextStyle` unconditionally overwrites `size`, `family`, `tracking`, `leading` from global typography for title/headline classes. After this change, each field will only be overwritten by global typography when that field name is NOT listed in `slot.overridden`.

Fields that are always per-slot (never globally governed): `weight`, `align`, `fit`.
For body class: `family`, `tracking`, `leading` are also always per-slot.

### Tests first

- [ ] **Step 1: Write the new tests in `src/render/resolve-style.test.ts`**

Append (after the existing tests) — the `makeSlot` helper already exists in that file and accepts an optional `overrides` param for `text`; we need it to also accept `slot`-level fields. We'll re-use `makeSlot` for existing tests and add a second maker for override tests.

```ts
// ── Override-aware tests ─────────────────────────────────────────────────────

function makeOverriddenSlot(
  role: Slot['role'],
  typeClass: Slot['typeClass'],
  textOverrides: Partial<NonNullable<Slot['text']>>,
  overridden: string[],
): Slot {
  return {
    id: 'override-test',
    role,
    cell: { c: 0, cs: 1, r: 0, rs: 1 },
    content: 'X',
    text: {
      family: 'sans',
      weight: 700,
      size: 48,
      tracking: 0,
      leading: 1,
      align: 'left',
      fit: 'fixed',
      ...textOverrides,
    },
    typeClass,
    overridden,
  }
}

test('title class with no overrides: size = global typography.title', () => {
  const slot = makeOverriddenSlot('headline', 'title', {}, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(typography.title) // 120
})

test('title class with overridden:["size"]: size = slot.text.size (999)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { size: 999 }, ['size'])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(999)
})

test('title class with overridden:["family"]: family = slot.text.family (mono)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { family: 'mono' }, ['family'])
  const result = resolveTextStyle(slot, typography)
  expect(result.family).toBe('mono')
  // size is NOT overridden, so still uses global
  expect(result.size).toBe(typography.title)
})

test('title class with overridden:["tracking"]: tracking = slot.text.tracking (0.05)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { tracking: 0.05 }, ['tracking'])
  const result = resolveTextStyle(slot, typography)
  expect(result.tracking).toBe(0.05)
})

test('title class with overridden:["leading"]: leading = slot.text.leading (1.8)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { leading: 1.8 }, ['leading'])
  const result = resolveTextStyle(slot, typography)
  expect(result.leading).toBe(1.8)
})

test('body class: size never overridden by slot (body size = global body, no override field used)', () => {
  // Body slots only have size globally governed. Even if overridden:['size'],
  // body size comes from slot.text.size when field is overridden.
  const slot = makeOverriddenSlot('caption', 'body', { size: 999 }, ['size'])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(999)
})

test('body class with empty overridden: size = global typography.body', () => {
  const slot = makeOverriddenSlot('caption', 'body', {}, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(typography.body) // 18
})

test('weight and align are never globally governed; not affected by overridden', () => {
  const slot = makeOverriddenSlot('headline', 'title', { weight: 300, align: 'right' }, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.weight).toBe(300)
  expect(result.align).toBe('right')
})
```

- [ ] **Step 2: Run the new tests to confirm they FAIL**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/render/resolve-style.test.ts 2>&1 | tail -20
```

Expected: Several FAILs (the override tests don't pass yet because the implementation hasn't changed).

- [ ] **Step 3: Rewrite `resolveTextStyle` in `src/render/resolve-style.ts`**

Replace the entire file content:

```ts
import type { Slot, TextStyle, Typography } from '../types'
import { classOf } from '../design/typeclass'

/**
 * Compute the effective TextStyle for a text slot by applying typography
 * class overrides from the design's Typography settings.
 *
 * Global typography governs:
 *   - All classes: `size`
 *   - title/headline classes only: `family`, `tracking`, `leading`
 *
 * A field is NOT overridden by global typography when its name appears in
 * `slot.overridden` — in that case the slot's own text value wins.
 *
 * Fields never globally governed (always per-slot): `weight`, `align`, `fit`.
 * For body class: `family`, `tracking`, `leading` are also always per-slot.
 */
export function resolveTextStyle(slot: Slot, typography: Typography): TextStyle {
  const base = slot.text!
  const cls = slot.typeClass ?? classOf(slot.role)
  const ov = slot.overridden ?? []

  function pick<K extends keyof TextStyle>(
    field: K,
    globalValue: TextStyle[K],
  ): TextStyle[K] {
    return ov.includes(field) ? base[field] : globalValue
  }

  if (cls === 'title' || cls === 'headline') {
    return {
      ...base,
      size: pick('size', typography[cls] as number),
      family: pick('family', typography.typeface),
      tracking: pick('tracking', typography.tracking),
      leading: pick('leading', typography.leading),
    }
  }

  // body — only size is globally governed
  return {
    ...base,
    size: pick('size', typography.body),
  }
}
```

- [ ] **Step 4: Run all resolve-style tests to confirm all pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/render/resolve-style.test.ts 2>&1 | tail -20
```

Expected: All tests PASS (both old and new).

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -15
```

Expected: 241 + new tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/render/resolve-style.ts src/render/resolve-style.test.ts
git commit -m "feat(resolve-style): respect slot.overridden to let per-element values win over global typography"
```

---

## Task 3: Update Renderer and ComposerOverlay for per-slot color + bw

**Files:**
- Modify: `src/render/Renderer.tsx`
- Modify: `src/ui/ComposerOverlay.tsx`
- Modify: `src/render/Renderer.test.tsx`

### Tests first

- [ ] **Step 1: Add new Renderer tests in `src/render/Renderer.test.tsx`**

Append after the existing tests:

```ts
test('slot.color overrides palette.text for text slot fill', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = false
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.color = '#ff0000'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe('#ff0000')
})

test('slot.color overrides palette.accent for title slot when accentHeadline=true', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = true
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.color = '#00ff00'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe('#00ff00')
})

test('slot.bw=false overrides global bwImage=true: image has no bw filter', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.bwImage = true
  const imgSlot = d.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.bw = false
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector(`[data-slot="${imgSlot.id}"] image`)!
  expect(img.getAttribute('filter')).toBeNull()
})

test('slot.bw=true overrides global bwImage=false: image gets bw filter', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.bwImage = false
  const imgSlot = d.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.bw = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector(`[data-slot="${imgSlot.id}"] image`)!
  expect(img.getAttribute('filter')).toBe('url(#raster-bw)')
})
```

- [ ] **Step 2: Run new Renderer tests to confirm they FAIL**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/render/Renderer.test.tsx 2>&1 | tail -20
```

Expected: 4 new test failures.

- [ ] **Step 3: Update `src/render/Renderer.tsx` — text color + image bw**

In the image slot rendering block, change:

```tsx
// BEFORE:
<SlotImage box={box} src={slot.content} bw={style.bwImage} />

// AFTER:
<SlotImage box={box} src={slot.content} bw={slot.bw ?? style.bwImage} />
```

In the text slot rendering block, change:

```tsx
// BEFORE:
const color = (style.accentHeadline && cls === 'title')
  ? palette.accent
  : palette.text

// AFTER:
const color = slot.color ??
  ((style.accentHeadline && cls === 'title') ? palette.accent : palette.text)
```

- [ ] **Step 4: Update `src/ui/ComposerOverlay.tsx` — `slotColor` helper uses `slot.color`**

Find the `slotColor` function (around line 48):

```ts
// BEFORE:
function slotColor(slot: Slot, design: { palette: { accent: string; text: string }; style: { accentHeadline: boolean } }): string {
  const tc = slot.typeClass ?? (isTextSlot(slot) ? classOf(slot.role as never) : undefined)
  if (design.style.accentHeadline && tc === 'title') return design.palette.accent
  return design.palette.text
}

// AFTER:
function slotColor(slot: Slot, design: { palette: { accent: string; text: string }; style: { accentHeadline: boolean } }): string {
  if (slot.color) return slot.color
  const tc = slot.typeClass ?? (isTextSlot(slot) ? classOf(slot.role as never) : undefined)
  if (design.style.accentHeadline && tc === 'title') return design.palette.accent
  return design.palette.text
}
```

- [ ] **Step 5: Run Renderer tests — all must pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/render/Renderer.test.tsx 2>&1 | tail -20
```

Expected: All tests PASS (old + 4 new).

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -15
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/render/Renderer.tsx src/ui/ComposerOverlay.tsx src/render/Renderer.test.tsx
git commit -m "feat(renderer): per-slot color and bw overrides; update ComposerOverlay slotColor"
```

---

## Task 4: Add store actions — `overrideText`, `setColor`, `setBw`, `resetElement`

**Files:**
- Modify: `src/store/useDesign.ts`
- Modify: `src/store/useDesign.test.ts`

### Tests first

- [ ] **Step 1: Add store action tests to `src/store/useDesign.test.ts`**

Append after existing tests:

```ts
// ── Per-element override actions ──────────────────────────────────────────────

test('overrideText: sets patched fields on slot.text and adds to overridden', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 200, family: 'mono' })
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.text!.size).toBe(200)
  expect(word.text!.family).toBe('mono')
  expect(word.overridden).toContain('size')
  expect(word.overridden).toContain('family')
})

test('overrideText: deduplicates overridden list', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 100 })
  useDesign.getState().overrideText('word', { size: 200 })
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.overridden!.filter(f => f === 'size').length).toBe(1)
})

test('overrideText coalesces: two consecutive calls = one undo step', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforePastLen = useDesign.getState().past.length
  useDesign.getState().overrideText('word', { size: 100 })
  useDesign.getState().overrideText('word', { size: 150 })
  // coalesced — only one step added
  expect(useDesign.getState().past.length).toBe(beforePastLen + 1)
})

test('setColor: sets slot.color and coalesces', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setColor('word', '#ff0000')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.color).toBe('#ff0000')
})

test('setColor coalesces', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().setColor('word', '#ff0000')
  useDesign.getState().setColor('word', '#00ff00')
  expect(useDesign.getState().past.length).toBe(beforeLen + 1)
})

test('setBw: sets slot.bw (discrete step)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')
  if (!imgSlot) return // if no image slot in mega-word, skip
  useDesign.getState().setBw(imgSlot.id, false)
  const updated = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(updated.bw).toBe(false)
})

test('resetElement: clears overridden, color, bw for a slot', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 999 })
  useDesign.getState().setColor('word', '#aabbcc')
  useDesign.getState().resetElement('word')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.overridden).toBeUndefined()
  expect(word.color).toBeUndefined()
  expect(word.bw).toBeUndefined()
})
```

- [ ] **Step 2: Run new tests to confirm they FAIL**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/store/useDesign.test.ts 2>&1 | tail -20
```

Expected: Several FAILs (actions not implemented yet).

- [ ] **Step 3: Add the new actions to `State` interface in `src/store/useDesign.ts`**

Find the `interface State {` block and add after `setFill`:

```ts
// Per-element overrides
overrideText: (slotId: string, patch: Partial<TextStyle>) => void
setColor: (slotId: string, hex: string) => void
setBw: (slotId: string, bw: boolean) => void
resetElement: (slotId: string) => void
```

- [ ] **Step 4: Implement the new actions in the `create<State>((set, get) => { return { ... } })` body**

After the `setFill` implementation, add:

```ts
overrideText: (slotId, patch) => {
  const design = get().design
  const newFields = Object.keys(patch) as string[]
  const d = {
    ...design,
    slots: design.slots.map(s => {
      if (s.id !== slotId || !s.text) return s
      const prevOverridden = s.overridden ?? []
      const overridden = [...new Set([...prevOverridden, ...newFields])]
      return { ...s, text: { ...s.text, ...patch }, overridden }
    }),
  }
  commit(d, { coalesceKey: `text:${slotId}` })
},

setColor: (slotId, hex) => {
  const d = {
    ...get().design,
    slots: get().design.slots.map(s => s.id === slotId ? { ...s, color: hex } : s),
  }
  commit(d, { coalesceKey: `color:${slotId}` })
},

setBw: (slotId, bw) => {
  const d = {
    ...get().design,
    slots: get().design.slots.map(s => s.id === slotId ? { ...s, bw } : s),
  }
  commit(d)
},

resetElement: (slotId) => {
  const d = {
    ...get().design,
    slots: get().design.slots.map(s => {
      if (s.id !== slotId) return s
      const { overridden: _o, color: _c, bw: _b, ...rest } = s
      return rest
    }),
  }
  commit(d)
},
```

- [ ] **Step 5: Run store tests — all must pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/store/useDesign.test.ts src/store/history.test.ts 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -15
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/store/useDesign.ts src/store/useDesign.test.ts
git commit -m "feat(store): add overrideText, setColor, setBw, resetElement per-element override actions"
```

---

## Task 5: Build the rich element inspector in `ComposerRail.tsx`

**Files:**
- Modify: `src/ui/ComposerRail.tsx`
- Modify: `src/ui/ComposerRail.test.tsx`

### Overview of what to build

Replace the existing `{selectedSlot && ( ... )}` block (around line 267–357 in the current file) with a full inspector. Keep the empty state text. The inspector is organized by element type:

- **Header row**: element type label + icon buttons (Duplicate, Delete, BringForward, SendBack).
- **Position & Size**: X/Y/W/H editable number inputs bound to `setBox`.
- **Reset to global**: button shown only when `slot.overridden?.length || slot.color !== undefined || slot.bw !== undefined`. Calls `resetElement`.
- **Text section** (when `slot.text` exists): Content textarea, Typeface select, Size number, Weight select, Tracking number, Leading number, Align buttons, Fit toggle, Colour swatch.
- **Image section** (when `slot.role === 'image'`): Replace/Re-crop button, B&W checkbox.
- **Block/Line section**: Fill (Accent / Text / Custom swatch).

Use small helper components `NumberField` and `InspectorRow` defined at the top of the file (not exported — they're internal).

### Tests first

- [ ] **Step 1: Append new tests to `src/ui/ComposerRail.test.tsx`**

```ts
// ── Rich inspector ─────────────────────────────────────────────────────────────

import { useDesign } from '../store/useDesign'

test('selecting a text element shows Typeface select', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Typeface')).toBeTruthy()
})

test('selecting a text element shows Tracking input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Tracking')).toBeTruthy()
})

test('selecting a text element shows Leading input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Leading')).toBeTruthy()
})

test('selecting a text element shows Weight select', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Weight')).toBeTruthy()
})

test('changing Size input calls overrideText with size and fit:fixed', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const overrideText = vi.spyOn(useDesign.getState(), 'overrideText')
  render(<ComposerRail />)
  const sizeInput = screen.getByLabelText('Size') as HTMLInputElement
  fireEvent.change(sizeInput, { target: { value: '200' } })
  expect(overrideText).toHaveBeenCalledWith(textSlot.id, { size: 200, fit: 'fixed' })
})

test('changing Typeface select calls overrideText with family', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const overrideText = vi.spyOn(useDesign.getState(), 'overrideText')
  render(<ComposerRail />)
  const typefaceSelect = screen.getByLabelText('Typeface') as HTMLSelectElement
  fireEvent.change(typefaceSelect, { target: { value: 'mono' } })
  expect(overrideText).toHaveBeenCalledWith(textSlot.id, { family: 'mono' })
})

test('selecting an image element shows B&W checkbox', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Black & white')).toBeTruthy()
})

test('toggling B&W checkbox on image calls setBw', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  const setBw = vi.spyOn(useDesign.getState(), 'setBw')
  render(<ComposerRail />)
  // Find the hidden checkbox input
  const bwLabel = screen.getByLabelText('Black & white')
  fireEvent.click(bwLabel)
  expect(setBw).toHaveBeenCalled()
})

test('selecting a shape element shows Fill: Accent and Text buttons', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  expect(screen.getByRole('button', { name: /accent/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /text/i })).toBeTruthy()
})

test('position inputs are shown for selected element', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('X position')).toBeTruthy()
  expect(screen.getByLabelText('Y position')).toBeTruthy()
  expect(screen.getByLabelText('Width')).toBeTruthy()
  expect(screen.getByLabelText('Height')).toBeTruthy()
})
```

- [ ] **Step 2: Run new tests to confirm they FAIL**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/ui/ComposerRail.test.tsx 2>&1 | tail -30
```

Expected: All new tests fail (inspector not built yet).

- [ ] **Step 3: Add helper components and hook up new store actions at the top of `ComposerRail.tsx`**

Add to the import line (the existing import from `'../store/useDesign'` already exists — just expand the destructuring in the component body):

```tsx
import { resolveTextStyle } from '../render/resolve-style'
import type { FontFamily } from '../types'
```

Add these internal helper components before the `ComposerRail` function:

```tsx
// ── NumberField ───────────────────────────────────────────────────────────────
function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={[
          'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
          'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
        ].join(' ')}
      />
    </div>
  )
}

// ── InspectorRow ──────────────────────────────────────────────────────────────
function InspectorRow({ label, children, overridden }: { label: string; children: React.ReactNode; overridden?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {label}
        </span>
        {overridden && (
          <span
            title="Overridden"
            className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0"
            aria-label="field overridden"
          />
        )}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Wire up new store actions in the `ComposerRail` component body**

In the `ComposerRail` function, after the existing `setText` / `setFill` lines, add:

```tsx
const overrideText = useDesign(s => s.overrideText)
const setColor = useDesign(s => s.setColor)
const setBw = useDesign(s => s.setBw)
const resetElement = useDesign(s => s.resetElement)
const requestCrop = useDesign(s => s.requestCrop)
const setContent = useDesign(s => s.setContent)
```

- [ ] **Step 5: Replace the selected panel in `ComposerRail.tsx`**

Find the section starting at approximately:

```tsx
{/* Selected element mini-panel */}
<SectionLabel>Selected</SectionLabel>
<div className="px-4 pb-4">
  {!selectedSlot && ( ... )}
  {selectedSlot && (
    <div className="space-y-3">
      ...
    </div>
  )}
</div>
```

Replace with (keep the `<SectionLabel>` and outer `<div className="px-4 pb-4">`, replace the inner content):

```tsx
{/* Selected element inspector */}
<SectionLabel>Properties</SectionLabel>
<div className="px-4 pb-4">
  {!selectedSlot && (
    <p className="text-xs text-neutral-400 leading-relaxed">
      Select an element on the canvas to edit it.
    </p>
  )}

  {selectedSlot && (() => {
    const isText = selectedSlot.role !== 'image' && selectedSlot.role !== 'block' && selectedSlot.role !== 'line'
    const isImage = selectedSlot.role === 'image'
    const isShape = selectedSlot.role === 'block' || selectedSlot.role === 'line'
    const hasOverrides = !!(selectedSlot.overridden?.length || selectedSlot.color !== undefined || selectedSlot.bw !== undefined)
    const ov = selectedSlot.overridden ?? []
    const resolvedText = isText && selectedSlot.text
      ? resolveTextStyle(selectedSlot, design.typography)
      : null

    const typeLabel = isImage ? 'Image' : isShape ? (selectedSlot.role === 'line' ? 'Line' : 'Shape') : 'Text'

    const iconBtnCls = [
      'rounded p-1 text-neutral-500',
      'hover:bg-neutral-100 hover:text-neutral-900',
      'active:scale-[0.97] transition-transform duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
    ].join(' ')

    return (
      <div className="space-y-3">
        {/* Header: type label + action buttons */}
        <div className="flex items-center gap-1">
          <span className="flex-1 text-xs font-semibold text-neutral-700">{typeLabel}</span>
          <button
            onClick={() => duplicateElement(selectedSlot.id)}
            className={iconBtnCls}
            aria-label="Duplicate element"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => bringForward(selectedSlot.id)}
            className={iconBtnCls}
            aria-label="Bring forward"
            title="Bring forward"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => sendBackward(selectedSlot.id)}
            className={iconBtnCls}
            aria-label="Send backward"
            title="Send backward"
          >
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => deleteElement(selectedSlot.id)}
            className={[iconBtnCls, 'hover:bg-red-50 hover:text-red-600'].join(' ')}
            aria-label="Delete element"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Reset to global — only when overrides present */}
        {hasOverrides && (
          <button
            onClick={() => resetElement(selectedSlot.id)}
            className={[
              'w-full rounded border border-blue-200 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600',
              'hover:bg-blue-50 active:scale-[0.97] transition-transform duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40',
            ].join(' ')}
          >
            Reset to global
          </button>
        )}

        {/* TEXT controls */}
        {isText && selectedSlot.text && (
          <div className="space-y-2.5">
            {/* Content */}
            <InspectorRow label="Content">
              <textarea
                aria-label="Content"
                rows={2}
                value={selectedSlot.content}
                onChange={e => setContent(selectedSlot.id, e.target.value)}
                className={[
                  'w-full rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-800 resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              />
            </InspectorRow>

            {/* Typeface */}
            <InspectorRow label="Typeface" overridden={ov.includes('family')}>
              <select
                id={`insp-typeface-${selectedSlot.id}`}
                aria-label="Typeface"
                value={resolvedText!.family}
                onChange={e => overrideText(selectedSlot.id, { family: e.target.value as FontFamily })}
                className={[
                  'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              >
                <option value="display">Archivo Display</option>
                <option value="sans">Inter</option>
                <option value="condensed">Archivo Narrow</option>
                <option value="mono">Space Mono</option>
              </select>
            </InspectorRow>

            {/* Size */}
            <InspectorRow label="Size" overridden={ov.includes('size')}>
              <input
                id={`insp-size-${selectedSlot.id}`}
                aria-label="Size"
                type="number"
                min={10}
                max={600}
                value={resolvedText!.size}
                onChange={e => overrideText(selectedSlot.id, { size: Number(e.target.value), fit: 'fixed' })}
                className={[
                  'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              />
            </InspectorRow>

            {/* Weight */}
            <InspectorRow label="Weight">
              <select
                id={`insp-weight-${selectedSlot.id}`}
                aria-label="Weight"
                value={selectedSlot.text.weight}
                onChange={e => setText(selectedSlot.id, { weight: Number(e.target.value) })}
                className={[
                  'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </InspectorRow>

            {/* Tracking */}
            <InspectorRow label="Tracking" overridden={ov.includes('tracking')}>
              <input
                id={`insp-tracking-${selectedSlot.id}`}
                aria-label="Tracking"
                type="number"
                step={0.005}
                value={resolvedText!.tracking}
                onChange={e => overrideText(selectedSlot.id, { tracking: Number(e.target.value) })}
                className={[
                  'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              />
            </InspectorRow>

            {/* Leading */}
            <InspectorRow label="Leading" overridden={ov.includes('leading')}>
              <input
                id={`insp-leading-${selectedSlot.id}`}
                aria-label="Leading"
                type="number"
                step={0.01}
                value={resolvedText!.leading}
                onChange={e => overrideText(selectedSlot.id, { leading: Number(e.target.value) })}
                className={[
                  'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                ].join(' ')}
              />
            </InspectorRow>

            {/* Align */}
            <InspectorRow label="Align">
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setText(selectedSlot.id, { align: a })}
                    aria-label={`Align ${a}`}
                    className={[
                      'flex-1 flex items-center justify-center rounded border py-1.5',
                      'transition-colors duration-100',
                      selectedSlot.text?.align === a
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    {a === 'left' && <AlignLeft size={13} />}
                    {a === 'center' && <AlignCenter size={13} />}
                    {a === 'right' && <AlignRight size={13} />}
                  </button>
                ))}
              </div>
            </InspectorRow>

            {/* Fit */}
            <InspectorRow label="Fit" overridden={ov.includes('fit')}>
              <div className="flex gap-1">
                {(['auto', 'fixed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setText(selectedSlot.id, { fit: f })}
                    className={[
                      'flex-1 rounded border py-1.5 text-xs font-medium capitalize',
                      'transition-colors duration-100',
                      selectedSlot.text?.fit === f
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </InspectorRow>

            {/* Colour */}
            <InspectorRow label="Colour" overridden={selectedSlot.color !== undefined}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Element colour"
                  value={selectedSlot.color ?? design.palette.text}
                  onChange={e => setColor(selectedSlot.id, e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
                />
                {!selectedSlot.color && (
                  <span className="text-[10px] text-neutral-400">using global</span>
                )}
              </div>
            </InspectorRow>
          </div>
        )}

        {/* IMAGE controls */}
        {isImage && (
          <div className="space-y-2.5">
            {/* Replace / Re-crop */}
            <button
              onClick={() => requestCrop(selectedSlot.id, selectedSlot.content)}
              className={[
                'w-full rounded border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700',
                'hover:border-neutral-400 active:scale-[0.97] transition-transform duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
              ].join(' ')}
            >
              {selectedSlot.content ? 'Re-crop / Replace' : 'Choose image'}
            </button>

            {/* B&W */}
            <InspectorRow label="Black & white" overridden={selectedSlot.bw !== undefined}>
              <Checkbox
                id={`insp-bw-${selectedSlot.id}`}
                label="Black & white"
                checked={selectedSlot.bw ?? design.style.bwImage}
                onChange={v => setBw(selectedSlot.id, v)}
              />
            </InspectorRow>
          </div>
        )}

        {/* SHAPE / LINE controls */}
        {isShape && (
          <div className="space-y-2.5">
            <InspectorRow label="Fill">
              <div className="flex gap-1 flex-wrap">
                {(['accent', 'text'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFill(selectedSlot.id, f)}
                    className={[
                      'flex-1 rounded border py-1.5 text-xs font-medium capitalize',
                      'transition-colors duration-100',
                      selectedSlot.fill === f
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    {f}
                  </button>
                ))}
                {/* Custom colour */}
                <input
                  type="color"
                  aria-label="Custom fill colour"
                  value={
                    !['accent', 'text'].includes(selectedSlot.fill ?? '')
                      ? (selectedSlot.fill ?? design.palette.accent)
                      : design.palette.accent
                  }
                  onChange={e => setFill(selectedSlot.id, e.target.value)}
                  title="Custom colour"
                  className="h-8 w-8 cursor-pointer rounded border border-neutral-200 p-0.5"
                />
              </div>
            </InspectorRow>
          </div>
        )}

        {/* Position & Size */}
        {resolvedBox && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
              Position & Size
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                id={`insp-x-${selectedSlot.id}`}
                label="X"
                value={Math.round(resolvedBox.x)}
                onChange={v => setBox(selectedSlot.id, { ...resolvedBox, x: v })}
              />
              <NumberField
                id={`insp-y-${selectedSlot.id}`}
                label="Y"
                value={Math.round(resolvedBox.y)}
                onChange={v => setBox(selectedSlot.id, { ...resolvedBox, y: v })}
              />
              <NumberField
                id={`insp-w-${selectedSlot.id}`}
                label="W"
                value={Math.round(resolvedBox.w)}
                min={1}
                onChange={v => setBox(selectedSlot.id, { ...resolvedBox, w: v })}
              />
              <NumberField
                id={`insp-h-${selectedSlot.id}`}
                label="H"
                value={Math.round(resolvedBox.h)}
                min={1}
                onChange={v => setBox(selectedSlot.id, { ...resolvedBox, h: v })}
              />
            </div>
          </div>
        )}
      </div>
    )
  })()}
</div>
```

Note: The existing `<SectionLabel>Selected</SectionLabel>` becomes `<SectionLabel>Properties</SectionLabel>`.

The aria-label for position NumberField inputs are set via the label prop ("X", "Y", "W", "H") but the tests use `getByLabelText('X position')` etc. Update the `NumberField` labels passed for position to be: "X position", "Y position", "Width", "Height":

```tsx
<NumberField id={`insp-x-${selectedSlot.id}`} label="X position" ... />
<NumberField id={`insp-y-${selectedSlot.id}`} label="Y position" ... />
<NumberField id={`insp-w-${selectedSlot.id}`} label="Width" ... />
<NumberField id={`insp-h-${selectedSlot.id}`} label="Height" ... />
```

- [ ] **Step 6: Run ComposerRail tests — all must pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run src/ui/ComposerRail.test.tsx 2>&1 | tail -30
```

Expected: All pass (old tests for align/size still pass because the new inspector includes those controls; the empty-state text might need checking).

**Note:** The old test `'empty state shown when nothing selected'` looks for `'Select an element on the canvas to edit it.'` — keep that exact string in the empty state.

The old test `'selecting a text element shows align buttons'` still passes because align buttons are present in the new inspector.

The old test `'align left button calls setText with align:left'` still passes because the new align buttons still call `setText`.

**Size input test:** The old test `selecting a text element shows align buttons` checked for `screen.getByLabelText('Align left')` — keep that.
The old test that changes size input (`size` input was `id="rail-text-size"`) — that test doesn't exist in the existing test file, so no compat issue.

- [ ] **Step 7: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -15
```

Expected: All pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/ComposerRail.tsx src/ui/ComposerRail.test.tsx
git commit -m "feat(ComposerRail): replace slim panel with full PROPERTIES inspector per element type"
```

---

## Task 6: Add "Global defaults" hints to left sidebar panels

**Files:**
- Modify: `src/ui/sidebar/TypographyControls.tsx`
- Modify: `src/ui/sidebar/StyleControls.tsx`

- [ ] **Step 1: Add hint line to `TypographyControls.tsx`**

Find the existing `<p className="text-xs text-neutral-400">` at the bottom of the `TypographyControls` return (currently: "Tracking and leading shape the display type (title + headline)."). Replace it with:

```tsx
<p className="text-xs text-neutral-400">
  Global defaults — select any element to override it. Tracking and leading apply to title + headline.
</p>
```

- [ ] **Step 2: Add hint line to `StyleControls.tsx`**

At the bottom of the `StyleControls` return (inside the outermost `<div className="sb-section space-y-4">`), after the checkboxes `</div>`, add:

```tsx
<p className="text-xs text-neutral-400">
  Global defaults — select any element to override per-element style.
</p>
```

- [ ] **Step 3: Run full test suite to ensure sidebar tests pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -15
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/sidebar/TypographyControls.tsx src/ui/sidebar/StyleControls.tsx
git commit -m "feat(sidebar): add Global defaults hint to Typography and Style panels"
```

---

## Task 7: TypeScript build check + final verification

- [ ] **Step 1: Run the TypeScript compiler in strict mode**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 2: Run the full Vitest suite and confirm all tests pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec vitest run 2>&1 | tail -20
```

Expected: All tests (241 original + all new) pass, 0 failures.

- [ ] **Step 3: Run the production build**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -20
```

Expected: Build completes without errors.

- [ ] **Step 4: Report BASE_SHA and commit SHAs**

```bash
cd /Users/mymac/Documents/Work/raster && git log --oneline -8
```

---

## Self-Review Checklist

| Spec requirement | Covered in task |
|---|---|
| `Slot` gains `overridden`, `color`, `bw` | Task 1 |
| `resolveTextStyle` respects `overridden` list | Task 2 |
| Renderer text color: `slot.color ??` | Task 3 |
| Renderer image: `slot.bw ?? style.bwImage` | Task 3 |
| `ComposerOverlay.slotColor` uses `slot.color` first | Task 3 |
| `overrideText` action + coalesce `text:${id}` | Task 4 |
| `setColor` action + coalesce `color:${id}` | Task 4 |
| `setBw` action (discrete) | Task 4 |
| `resetElement` action | Task 4 |
| Rich inspector: header row + duplicate/delete/forward/back | Task 5 |
| Inspector: Position & Size X/Y/W/H editable | Task 5 |
| Inspector: Reset to global (when overrides present) | Task 5 |
| Text: Content textarea | Task 5 |
| Text: Typeface select → `overrideText({family})` | Task 5 |
| Text: Size input → `overrideText({size, fit:'fixed'})` | Task 5 |
| Text: Weight select → `setText({weight})` | Task 5 |
| Text: Tracking → `overrideText({tracking})` | Task 5 |
| Text: Leading → `overrideText({leading})` | Task 5 |
| Text: Align buttons → `setText({align})` | Task 5 |
| Text: Fit toggle → `setText({fit})` | Task 5 |
| Text: Colour swatch → `setColor` | Task 5 |
| Text: Override dot indicator on overridden fields | Task 5 (blue dot in `InspectorRow`) |
| Image: Replace/Re-crop button → `requestCrop` | Task 5 |
| Image: B&W checkbox → `setBw` | Task 5 |
| Shape/Line: Fill Accent/Text/Custom → `setFill` | Task 5 |
| Empty state unchanged text | Task 5 |
| Global defaults hint in TypographyControls | Task 6 |
| Global defaults hint in StyleControls | Task 6 |
| resolve-style tests with overrides | Task 2 |
| Renderer tests: slot.color + slot.bw override | Task 3 |
| Store tests: overrideText, setColor, setBw, resetElement | Task 4 |
| ComposerRail tests: rich inspector controls | Task 5 |
| pnpm build clean | Task 7 |
| 241 + new tests pass | Task 7 |

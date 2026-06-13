# Raster v3 Phase D — UI Craft Pass + Composer Rail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native/plain controls with crafted editorial-Swiss UI, add a right-rail Composer panel, wire three distinct generation buttons, and lift snap state into the store.

**Architecture:** The app becomes 3 columns (Sidebar 360px | Canvas flex | ComposerRail 248px). Custom controls replace every native input, checkbox, and color picker. A new `ComposerRail` component (right rail) owns the Layers list, Add-element buttons, and selected-element mini-panel. Snap state moves from local useState in CanvasStage into the Zustand store so ComposerRail can toggle it. EditOverlay.tsx and FreeOverlay.tsx are deleted (ComposerOverlay supersedes them).

**Tech Stack:** React 19, Tailwind v4, Zustand 5, lucide-react 1.18.0, @radix-ui/react-slider, pnpm 11, Vitest 4

**BASE_SHA:** `2261d091d9e32b0dcae419bcbeeb0c67e0b6595a`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/store/useDesign.ts` | Add `snap: boolean` + `setSnap(b)` to store |
| Modify | `src/ui/CanvasStage.tsx` | Read snap from store; remove local snap state + temp checkbox |
| Modify | `src/ui/App.tsx` | 3-column layout: Sidebar \| Canvas \| ComposerRail |
| Modify | `src/ui/BottomBar.tsx` | "Layout N — name" / "Generated — unique"; styled Prev/Next with lucide icons; remove Free-mode toggle |
| Modify | `src/ui/ImageInput.tsx` | Replace native file input with custom dropzone + styled URL input |
| Modify | `src/ui/sidebar/StyleControls.tsx` | Custom checkboxes; styled accent swatch trigger; refined palette swatches |
| Modify | `src/ui/sidebar/TypographyControls.tsx` | Verify/fix shadcn Slider styling under Tailwind v4 |
| Modify | `src/ui/sidebar/CanvasChips.tsx` | Segmented control (connected strip, not individual pills) |
| Modify | `src/ui/sidebar/LayoutGrid.tsx` | Three distinct generation buttons (Shuffle/Pick/Surprise) with lucide icons + microcopy |
| Modify | `src/ui/components/slider.tsx` | Fix Slider thumb border to `border-neutral-900`; update track/range/thumb classes |
| Create | `src/ui/ComposerRail.tsx` | Add-element grid, Layers list, selected-element mini-panel, Snap toggle |
| Delete | `src/ui/EditOverlay.tsx` | Superseded by ComposerOverlay |
| Delete | `src/ui/FreeOverlay.tsx` | Superseded by ComposerOverlay |
| Delete | `src/ui/EditOverlay.test.tsx` | No longer needed |
| Create | `src/ui/ComposerRail.test.tsx` | Tests for Rail: add buttons, layers list, generation buttons, snap toggle |
| Modify | `src/ui/sidebar/Sidebar.test.tsx` | Update style checkbox test to use custom checkbox data-attr |

---

## Task 1: Add `snap` to the store

**Files:**
- Modify: `src/store/useDesign.ts`

- [ ] **Step 1.1: Write the failing test**

Add this test at the bottom of `src/ui/CanvasStage.test.tsx` (the file exists; open it to confirm, then append):

```typescript
// src/ui/CanvasStage.test.tsx  (append)
import { useDesign } from '../store/useDesign'

test('store snap defaults to true', () => {
  expect(useDesign.getState().snap).toBe(true)
})

test('setSnap updates store snap', () => {
  useDesign.getState().setSnap(false)
  expect(useDesign.getState().snap).toBe(false)
  useDesign.getState().setSnap(true)
})
```

- [ ] **Step 1.2: Run to verify it fails**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/CanvasStage.test.tsx
```

Expected: FAIL — `snap` does not exist on store.

- [ ] **Step 1.3: Add snap to store interface and implementation**

In `src/store/useDesign.ts`, in the `interface State` block (after the `cropRequest` line, around line 93), add:

```typescript
  snap: boolean
  setSnap: (snap: boolean) => void
```

Then in the `create<State>` call body (after `cropRequest: null,`), add:

```typescript
  snap: true,

  setSnap: (snap) => {
    set({ snap })
  },
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/CanvasStage.test.tsx
```

Expected: PASS all tests in that file.

- [ ] **Step 1.5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/store/useDesign.ts src/ui/CanvasStage.test.tsx && git commit -m "feat(store): add snap:boolean + setSnap to design store"
```

---

## Task 2: Lift snap out of CanvasStage, wire from store

**Files:**
- Modify: `src/ui/CanvasStage.tsx`

- [ ] **Step 2.1: Update CanvasStage to read snap from store**

Replace the `const [snap, setSnap] = useState(true)` line (line 21) and the entire `<label>` / native snap checkbox block at the bottom (lines 104–127) with store-derived snap:

```typescript
// Replace the useState line:
const snap = useDesign(s => s.snap)

// Remove the <label> block entirely (the old inline snap checkbox).
// The GrainAnimator line is the last child inside the outer div — leave it.
```

The `ComposerOverlay` already receives `snap` as a prop (`<ComposerOverlay scale={scale} snap={snap} />`); the prop now flows from the store. No other changes needed in this file.

- [ ] **Step 2.2: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all 186 tests pass (CanvasStage test file had no test for the local snap state).

- [ ] **Step 2.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/CanvasStage.tsx && git commit -m "refactor(canvas): lift snap state into store, remove inline checkbox"
```

---

## Task 3: Replace ImageInput with custom dropzone

**Files:**
- Modify: `src/ui/ImageInput.tsx`

The native `<input type="file">` ("Choose File") and the plain URL input must be replaced with:
1. A full-width dashed dropzone button (opening hidden file input on click)
2. A styled URL input with a lucide `Link` icon prefix

Both still route through `requestCrop`.

- [ ] **Step 3.1: Rewrite ImageInput.tsx**

```typescript
// src/ui/ImageInput.tsx
import { useRef, useState } from 'react'
import { Upload, Link } from 'lucide-react'
import { useDesign } from '../store/useDesign'

export function ImageInput({ slotId }: { slotId: string }) {
  const requestCrop = useDesign(s => s.requestCrop)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlValue, setUrlValue] = useState('')

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => requestCrop(slotId, String(reader.result))
    reader.readAsDataURL(file)
  }

  const onUrl = (url: string) => {
    if (!url.trim()) return
    requestCrop(slotId, url.trim())
    setUrlValue('')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }

  return (
    <div className="space-y-2">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {/* Custom dropzone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className={[
          'flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-4',
          'text-neutral-500 transition-colors duration-150',
          'hover:border-neutral-500 hover:text-neutral-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          'active:scale-[0.97] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        ].join(' ')}
      >
        <Upload size={18} strokeWidth={1.5} />
        <span className="text-sm font-medium">Upload image</span>
        <span className="text-[11px] text-neutral-400">or drop a file</span>
      </button>

      {/* Styled URL input */}
      <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-shadow duration-150">
        <Link size={13} className="shrink-0 text-neutral-400" />
        <input
          type="url"
          placeholder="Paste image URL"
          value={urlValue}
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          onChange={e => setUrlValue(e.target.value)}
          onBlur={e => onUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onUrl((e.target as HTMLInputElement).value)
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3.2: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass. (No tests directly test ImageInput; CropModal tests don't render it.)

- [ ] **Step 3.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/ImageInput.tsx && git commit -m "feat(ui): custom dropzone + styled URL input replaces native file input"
```

---

## Task 4: Custom checkboxes in StyleControls

**Files:**
- Modify: `src/ui/sidebar/StyleControls.tsx`

Replace native `<input type="checkbox">` with a custom accessible control: a visually styled `div` box, a lucide `Check` icon when checked, a hidden real `<input>` for a11y/keyboard, whole row clickable.

Also upgrade palette swatches to `h-9 w-9 rounded-lg border-2` with `ring-2 ring-neutral-900 ring-offset-2` when selected, plus show inner accent dot.

Also replace the bare `<input type=color>` accent picker with a styled swatch that opens the hidden picker.

- [ ] **Step 4.1: Rewrite StyleControls.tsx**

```typescript
// src/ui/sidebar/StyleControls.tsx
import { useRef } from 'react'
import { Check } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { PRESET_PALETTES } from '../../design/palettes'

interface CustomCheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function CustomCheckbox({ id, label, checked, onChange }: CustomCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 select-none"
    >
      {/* Hidden real input for a11y/keyboard */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        data-style-checkbox={id}
      />
      {/* Visual box */}
      <span
        aria-hidden="true"
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
          checked
            ? 'border-neutral-900 bg-neutral-900'
            : 'border-neutral-300 bg-white',
        ].join(' ')}
      >
        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )
}

export function StyleControls() {
  const palette = useDesign(s => s.design.palette)
  const style = useDesign(s => s.design.style)
  const setPalette = useDesign(s => s.setPalette)
  const setAccent = useDesign(s => s.setAccent)
  const setStyle = useDesign(s => s.setStyle)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const isSelectedPalette = (p: { bg: string; text: string; accent: string }) =>
    p.bg === palette.bg && p.text === palette.text && p.accent === palette.accent

  return (
    <div className="sb-section space-y-4">
      {/* Palette swatches */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Palette
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PALETTES.map(p => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => setPalette({ ...p.palette })}
              className={[
                'relative h-9 w-9 overflow-hidden rounded-lg border-2',
                'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'active:scale-[0.97]',
                isSelectedPalette(p.palette)
                  ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                  : 'border-neutral-200 hover:border-neutral-400',
              ].join(' ')}
              style={{ background: p.palette.bg }}
            >
              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 block h-2 w-2 rounded-sm"
                style={{ background: p.palette.accent }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour — styled swatch opens hidden color picker */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Accent
        </span>
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="h-7 w-12 rounded-md border-2 border-neutral-200 shadow-sm hover:border-neutral-400 transition-colors duration-150 active:scale-[0.97] transition-transform"
          style={{ background: palette.accent }}
          aria-label="Pick accent colour"
        />
        <input
          ref={colorInputRef}
          type="color"
          value={palette.accent}
          onChange={e => setAccent(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* Custom checkboxes */}
      <div className="space-y-2.5">
        {(
          [
            { key: 'accentHeadline', label: 'Accent the headline' },
            { key: 'bwImage', label: 'Black & white image' },
            { key: 'filmGrain', label: 'Film grain' },
            { key: 'gridOverlay', label: 'Show grid overlay' },
          ] as const
        ).map(({ key, label }) => (
          <CustomCheckbox
            key={key}
            id={`sc-${key}`}
            label={label}
            checked={style[key]}
            onChange={v => setStyle({ [key]: v })}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Fix the existing Sidebar test that clicks by aria-label**

The old Sidebar test uses `screen.getByLabelText('Film grain')`. With the custom checkbox, the `<label>` wraps the `<input id="sc-filmGrain">` so `getByLabelText` still works via `htmlFor`. Run the tests to verify.

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/Sidebar.test.tsx
```

Expected: PASS all tests (the `getByLabelText('Film grain')` matches the `<label>` element which wraps a checkbox with that id).

- [ ] **Step 4.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 4.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/sidebar/StyleControls.tsx && git commit -m "feat(ui): custom checkboxes, styled accent swatch, refined palette swatches"
```

---

## Task 5: Segmented control for CanvasChips

**Files:**
- Modify: `src/ui/sidebar/CanvasChips.tsx`

Replace individual pill buttons with a connected segmented control: one `inline-flex rounded-lg border bg-neutral-100 p-0.5` container with segments inside. Active = `bg-neutral-900 text-white rounded-md shadow-sm`. Use `flex-wrap` to handle overflow.

- [ ] **Step 5.1: Rewrite CanvasChips.tsx**

```typescript
// src/ui/sidebar/CanvasChips.tsx
import type { Format } from '../../types'
import { useDesign } from '../../store/useDesign'

const FORMAT_ORDER: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CanvasChips() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)

  return (
    <div className="sb-section">
      <div
        role="radiogroup"
        aria-label="Canvas format"
        className="inline-flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5"
      >
        {FORMAT_ORDER.map(f => (
          <button
            key={f}
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            className={[
              'rounded-md px-2.5 py-1 text-xs font-semibold',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20',
              'active:scale-[0.97] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              format === f
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 5.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/sidebar/CanvasChips.tsx && git commit -m "feat(ui): segmented control replaces format pill buttons"
```

---

## Task 6: Fix Slider styling + verify TypographyControls

**Files:**
- Modify: `src/ui/components/slider.tsx`

The current thumb has `border-neutral-300`. The spec calls for `border-neutral-900` (editorial feel, strong contrast). Update only the thumb class.

- [ ] **Step 6.1: Update slider.tsx thumb border**

In `src/ui/components/slider.tsx`, change the `SliderPrimitive.Thumb` className from:

```
'block h-4 w-4 rounded-full border border-neutral-300 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
```

to:

```
'block h-4 w-4 rounded-full border-2 border-neutral-900 bg-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
```

And update the `Track` to use `h-1.5` (already correct) and `Range` to `bg-neutral-900` (already correct).

- [ ] **Step 6.2: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 6.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/components/slider.tsx && git commit -m "feat(ui): slider thumb uses strong neutral-900 border for editorial feel"
```

---

## Task 7: Three distinct generation buttons in LayoutGrid

**Files:**
- Modify: `src/ui/sidebar/LayoutGrid.tsx`

Replace the current 2-button Shuffle/Surprise row with three distinct buttons:
- **Shuffle** (lucide `Shuffle`, outline) → `shuffle()`  
- **Pick for me** (lucide `Dices`, outline) → `pickForMe()`
- **Surprise** (lucide `Sparkles`, filled primary `bg-neutral-900 text-white`) → `surprise()`

Add a one-line helper microcopy beneath them. Keep the GSAP animation refs on Shuffle + Surprise icons.

- [ ] **Step 7.1: Rewrite LayoutGrid.tsx**

```typescript
// src/ui/sidebar/LayoutGrid.tsx
import { useRef } from 'react'
import { Shuffle, Dices, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffleAction = useDesign(s => s.shuffle)
  const pickForMeAction = useDesign(s => s.pickForMe)
  const surpriseAction = useDesign(s => s.surprise)

  const shuffleIconRef = useRef<SVGSVGElement>(null)
  const surpriseIconRef = useRef<SVGSVGElement>(null)

  function handleShuffle() {
    shuffleAction()
    if (!shuffleIconRef.current) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    gsap.fromTo(shuffleIconRef.current, { x: -3 }, { x: 0, duration: 0.2, ease: 'power3.out' })
  }

  function handleSurprise() {
    surpriseAction()
    if (!surpriseIconRef.current) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    gsap.from(surpriseIconRef.current, {
      rotation: -30,
      scale: 0.8,
      duration: 0.3,
      ease: 'power3.out',
      transformOrigin: '50% 50%',
    })
  }

  const baseBtn =
    'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ' +
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ' +
    'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10'

  return (
    <div className="sb-section space-y-3">
      {/* Layout grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
      >
        {LAYOUTS.map(({ n }) => (
          <button
            key={n}
            onClick={() => setLayout(n)}
            className={[
              'aspect-[3/4] rounded-md border text-sm flex items-center justify-center',
              'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'active:scale-[0.97]',
              layout === n
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:-translate-y-px hover:shadow-sm',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Three generation buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {/* Shuffle — outline */}
          <button
            onClick={handleShuffle}
            title="Rearrange this layout"
            className={[baseBtn, 'flex-1 border border-neutral-200 text-neutral-700 hover:border-neutral-400'].join(' ')}
          >
            <Shuffle ref={shuffleIconRef} size={14} />
            Shuffle
          </button>

          {/* Pick for me — outline */}
          <button
            onClick={pickForMeAction}
            title="Jump to a random preset layout"
            className={[baseBtn, 'flex-1 border border-neutral-200 text-neutral-700 hover:border-neutral-400'].join(' ')}
          >
            <Dices size={14} />
            Pick for me
          </button>
        </div>

        {/* Surprise — primary filled */}
        <button
          onClick={handleSurprise}
          title="Generate a brand-new unique design"
          className={[
            baseBtn,
            'w-full border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-800',
          ].join(' ')}
        >
          <Sparkles ref={surpriseIconRef} size={14} />
          Surprise me
        </button>
      </div>

      {/* Microcopy */}
      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Shuffle reworks this layout · Pick jumps to a preset · Surprise invents a new one.
      </p>
    </div>
  )
}
```

- [ ] **Step 7.2: Note on lucide refs**

`lucide-react` SVG icons accept a `ref` that resolves to an `SVGSVGElement`. However, lucide components may not forward refs by default in all versions. If the GSAP animation silently fails (no crash, just no animation), change the refs to wrapper `<span>` elements:

```typescript
// Alternative if lucide ref forwarding doesn't work:
const shuffleWrapRef = useRef<HTMLSpanElement>(null)
// ...
<button onClick={handleShuffle} ...>
  <span ref={shuffleWrapRef} style={{ display: 'contents' }}>
    <Shuffle size={14} />
  </span>
  Shuffle
</button>
```

And animate `shuffleWrapRef.current` instead.

- [ ] **Step 7.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass. (The existing Sidebar tests don't assert on button count/labels.)

- [ ] **Step 7.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/sidebar/LayoutGrid.tsx && git commit -m "feat(ui): three distinct generation buttons Shuffle/Pick/Surprise with lucide icons"
```

---

## Task 8: Style BottomBar

**Files:**
- Modify: `src/ui/BottomBar.tsx`

Changes:
1. Show "Layout N — name" for `layout >= 1`; show "Generated — unique" for `layout === 0`.
2. Style Prev/Next with lucide `ChevronLeft`/`ChevronRight` icons.
3. Remove the Free-mode toggle button.

- [ ] **Step 8.1: Rewrite BottomBar.tsx**

```typescript
// src/ui/BottomBar.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { LAYOUTS } from '../design/layouts'

export function BottomBar() {
  const design = useDesign(s => s.design)
  const prevLayout = useDesign(s => s.prevLayout)
  const nextLayout = useDesign(s => s.nextLayout)

  const layoutDef = LAYOUTS.find(l => l.n === design.layout)
  const layoutLabel =
    design.layout === 0
      ? 'Generated — unique'
      : `Layout ${design.layout}${layoutDef ? ` — ${layoutDef.name}` : ''}`

  const btnCls = [
    'flex items-center gap-1 rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700',
    'hover:border-neutral-400 hover:-translate-y-px',
    'active:scale-[0.97]',
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  ].join(' ')

  return (
    <div className="border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between text-sm">
      <div className="tabular-nums text-neutral-500">
        <span className="font-semibold text-neutral-900">
          {design.layout === 0 ? 'Generated' : `Layout ${design.layout}`}
        </span>
        {design.layout === 0 ? (
          <span className="text-neutral-400"> — unique</span>
        ) : layoutDef ? (
          <span className="text-neutral-400"> — {layoutDef.name}</span>
        ) : null}
      </div>

      <div className="flex gap-1">
        <button onClick={prevLayout} className={btnCls} aria-label="Previous layout">
          <ChevronLeft size={14} />
          Prev
        </button>
        <button onClick={nextLayout} className={btnCls} aria-label="Next layout">
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass (no tests directly assert on BottomBar content).

- [ ] **Step 8.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/BottomBar.tsx && git commit -m "feat(ui): styled BottomBar with generated label + lucide nav icons, remove free-mode toggle"
```

---

## Task 9: Create ComposerRail

**Files:**
- Create: `src/ui/ComposerRail.tsx`

This is the largest new component. It must:
1. Show a **COMPOSE** header with an `Add` group (2×2 grid of 4 buttons)
2. Show a **LAYERS** list (`orderedSlots` reversed = topmost first), each row clickable to select, with hover actions (ChevronUp/Down/Copy/Trash2)
3. Show a **selected element mini-panel** when `selectedId` is set
4. Show a **Snap to grid** custom checkbox (reading/writing `snap` from store)

For the selected element mini-panel:
- Text slot: quick align buttons (AlignLeft/AlignCenter/AlignRight → `setText({align:...})`) + size number input (`setText({size, fit:'fixed'})`)
- Block/line slot: fill toggle (3 options: 'accent', 'text', custom hex)
- All slots: x/y/w/h readouts in `tabular-nums` from the slot's resolved box (use `slotBox` from `src/lib/grid.ts`)

For fill toggle on block/line: the store doesn't have a `setFill` action yet. Add it inline in the store update using `setContent` workaround? No — `fill` is a different field. We'll call the existing `setBox` approach or need a new action. Check the store: there is no `setFill`. We need to add one.

**Sub-step: Add `setFill` to the store before building the Rail.**

- [ ] **Step 9.1: Add setFill to store interface and implementation**

In `src/store/useDesign.ts`, add to `interface State`:

```typescript
  setFill: (slotId: string, fill: string) => void
```

In the `create<State>` body:

```typescript
  setFill: (slotId, fill) => {
    const d = { ...get().design, slots: get().design.slots.map(s =>
      s.id === slotId ? { ...s, fill } : s) }
    persist(d); set({ design: d })
  },
```

- [ ] **Step 9.2: Create ComposerRail.tsx**

```typescript
// src/ui/ComposerRail.tsx
import { Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { orderedSlots } from '../design/order'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { Check } from 'lucide-react'
import type { Slot } from '../types'

// ── Micro label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
      {children}
    </div>
  )
}

// ── Hairline divider ─────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-neutral-200 mx-4" />
}

// ── Slot type icon ───────────────────────────────────────────────────────────
function SlotTypeIcon({ slot }: { slot: Slot }) {
  if (slot.role === 'image') return <Image size={12} className="text-neutral-400 shrink-0" />
  if (slot.role === 'block') return <Square size={12} className="text-neutral-400 shrink-0" />
  if (slot.role === 'line') return <Minus size={12} className="text-neutral-400 shrink-0" />
  return <Type size={12} className="text-neutral-400 shrink-0" />
}

// ── Slot label ───────────────────────────────────────────────────────────────
function slotLabel(slot: Slot): string {
  if (slot.role === 'image') return 'Image'
  if (slot.role === 'block') return 'Shape'
  if (slot.role === 'line') return 'Line'
  // text role: show content snippet
  const content = slot.content?.trim()
  if (content) return content.length > 20 ? content.slice(0, 20) + '…' : content
  return slot.role
}

// ── Custom checkbox ───────────────────────────────────────────────────────────
function Checkbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        data-rail-checkbox={id}
      />
      <span
        aria-hidden
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
          checked ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white',
        ].join(' ')}
      >
        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ComposerRail() {
  const design = useDesign(s => s.design)
  const selectedId = useDesign(s => s.selectedId)
  const selectElement = useDesign(s => s.selectElement)
  const addElement = useDesign(s => s.addElement)
  const deleteElement = useDesign(s => s.deleteElement)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  const setText = useDesign(s => s.setText)
  const setFill = useDesign(s => s.setFill)
  const snap = useDesign(s => s.snap)
  const setSnap = useDesign(s => s.setSnap)

  const canvas = canvasFor(design.format)
  const layers = [...orderedSlots(design)].reverse() // topmost first
  const selectedSlot = selectedId ? design.slots.find(s => s.id === selectedId) : null

  const resolvedBox = selectedSlot
    ? (selectedSlot.box ?? slotBox(selectedSlot, canvas, design.grid))
    : null

  const addBtnCls = [
    'flex flex-col items-center gap-1 rounded-md border border-neutral-200 py-2 px-1 text-neutral-600',
    'text-[11px] font-medium',
    'hover:border-neutral-400 hover:-translate-y-px hover:text-neutral-900',
    'active:scale-[0.97]',
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  ].join(' ')

  return (
    <aside
      className="w-[248px] shrink-0 border-l border-neutral-200 bg-white overflow-y-auto flex flex-col"
      aria-label="Composer"
    >
      {/* COMPOSE header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-900">
          Compose
        </div>
      </div>

      <Divider />

      {/* Add elements */}
      <SectionLabel>Add</SectionLabel>
      <div className="grid grid-cols-2 gap-1.5 px-4 pb-3">
        <button
          onClick={() => addElement('text')}
          className={addBtnCls}
          aria-label="Add text element"
          data-add-element="text"
        >
          <Type size={16} strokeWidth={1.5} />
          + Text
        </button>
        <button
          onClick={() => addElement('image')}
          className={addBtnCls}
          aria-label="Add image element"
          data-add-element="image"
        >
          <Image size={16} strokeWidth={1.5} />
          + Image
        </button>
        <button
          onClick={() => addElement('block')}
          className={addBtnCls}
          aria-label="Add shape element"
          data-add-element="block"
        >
          <Square size={16} strokeWidth={1.5} />
          + Shape
        </button>
        <button
          onClick={() => addElement('line')}
          className={addBtnCls}
          aria-label="Add line element"
          data-add-element="line"
        >
          <Minus size={16} strokeWidth={1.5} />
          + Line
        </button>
      </div>

      <Divider />

      {/* Layers list */}
      <SectionLabel>Layers</SectionLabel>
      <div className="flex flex-col pb-2" data-layers-list>
        {layers.length === 0 && (
          <div className="px-4 py-3 text-xs text-neutral-400">No layers yet.</div>
        )}
        {layers.map(slot => (
          <div
            key={slot.id}
            data-layer-row={slot.id}
            className={[
              'group relative flex items-center gap-2 px-4 py-2 cursor-pointer',
              'transition-colors duration-100',
              selectedId === slot.id
                ? 'bg-neutral-100 ring-1 ring-inset ring-neutral-900/10'
                : 'hover:bg-neutral-50',
            ].join(' ')}
            onClick={() => selectElement(slot.id)}
          >
            <SlotTypeIcon slot={slot} />
            <span className="flex-1 min-w-0 truncate text-xs text-neutral-700 tabular-nums">
              {slotLabel(slot)}
            </span>

            {/* Hover actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <button
                onClick={e => { e.stopPropagation(); bringForward(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Bring forward"
                title="Bring forward"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); sendBackward(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Send backward"
                title="Send backward"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); duplicateElement(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Duplicate"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteElement(slot.id) }}
                className="rounded p-0.5 hover:bg-red-50 text-neutral-500 hover:text-red-600"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* Selected element mini-panel */}
      <SectionLabel>Selected</SectionLabel>
      <div className="px-4 pb-4">
        {!selectedSlot && (
          <p className="text-xs text-neutral-400 leading-relaxed">
            Select an element on the canvas to edit it.
          </p>
        )}

        {selectedSlot && (
          <div className="space-y-3">
            {/* Text-slot controls */}
            {selectedSlot.text && (
              <div className="space-y-2">
                {/* Align */}
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Align</div>
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
                </div>

                {/* Size */}
                <div>
                  <label
                    htmlFor="rail-text-size"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Size
                  </label>
                  <input
                    id="rail-text-size"
                    type="number"
                    min={10}
                    max={600}
                    value={selectedSlot.text.size}
                    onChange={e => setText(selectedSlot.id, { size: Number(e.target.value), fit: 'fixed' })}
                    className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm tabular-nums text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </div>
            )}

            {/* Block/Line fill */}
            {(selectedSlot.role === 'block' || selectedSlot.role === 'line') && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Fill</div>
                <div className="flex gap-1">
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
                </div>
              </div>
            )}

            {/* Box readouts */}
            {resolvedBox && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Position</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['x', 'y', 'w', 'h'] as const).map(k => (
                    <div key={k} className="flex items-center gap-1 rounded border border-neutral-200 px-2 py-1">
                      <span className="text-[10px] font-semibold uppercase text-neutral-400 w-3 shrink-0">{k}</span>
                      <span className="text-xs tabular-nums text-neutral-700">{Math.round(resolvedBox[k])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Divider />
        {/* Snap to grid toggle */}
        <div className="px-4 py-3">
          <Checkbox
            id="rail-snap"
            label="Snap to grid"
            checked={snap}
            onChange={setSnap}
          />
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 9.3: Check that `slotBox` is exported from `src/lib/grid.ts`**

```bash
grep -n "export" /Users/mymac/Documents/Work/raster/src/lib/grid.ts | head -20
```

If `slotBox` is not exported, add `export` to its function declaration in that file.

- [ ] **Step 9.4: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass (no tests yet for ComposerRail).

- [ ] **Step 9.5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/ComposerRail.tsx src/store/useDesign.ts src/lib/grid.ts && git commit -m "feat(ui): ComposerRail — layers list, add elements, selected panel, snap toggle"
```

---

## Task 10: Wire App.tsx to 3-column layout

**Files:**
- Modify: `src/ui/App.tsx`

Add `ComposerRail` as the third column to the right of the canvas.

- [ ] **Step 10.1: Update App.tsx**

```typescript
// src/ui/App.tsx
import { useRef } from 'react'
import { Sidebar } from './Sidebar'
import { CanvasStage } from './CanvasStage'
import { BottomBar } from './BottomBar'
import { CropModal } from './CropModal'
import { ComposerRail } from './ComposerRail'
import '../archetypes/index'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar svgRef={svgRef} />
        <main className="min-w-0 flex-1">
          <CanvasStage svgRef={svgRef} />
        </main>
        <ComposerRail />
      </div>
      <BottomBar />
      <CropModal />
    </div>
  )
}
```

- [ ] **Step 10.2: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 10.3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/App.tsx && git commit -m "feat(ui): 3-column layout — Sidebar | Canvas | ComposerRail"
```

---

## Task 11: Delete EditOverlay and FreeOverlay + their tests

**Files:**
- Delete: `src/ui/EditOverlay.tsx`
- Delete: `src/ui/FreeOverlay.tsx`
- Delete: `src/ui/EditOverlay.test.tsx`

- [ ] **Step 11.1: Verify no remaining imports**

```bash
grep -rn "EditOverlay\|FreeOverlay" /Users/mymac/Documents/Work/raster/src/
```

Expected: zero results (neither is imported anywhere since ComposerOverlay replaced them). If any imports remain, remove them.

- [ ] **Step 11.2: Delete the files**

```bash
rm /Users/mymac/Documents/Work/raster/src/ui/EditOverlay.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/FreeOverlay.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/EditOverlay.test.tsx
```

- [ ] **Step 11.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all remaining tests pass, EditOverlay test suite is gone.

- [ ] **Step 11.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add -A && git commit -m "chore(ui): delete EditOverlay and FreeOverlay (superseded by ComposerOverlay)"
```

---

## Task 12: Write ComposerRail tests

**Files:**
- Create: `src/ui/ComposerRail.test.tsx`

- [ ] **Step 12.1: Create test file**

```typescript
// src/ui/ComposerRail.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComposerRail } from './ComposerRail'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'
import React from 'react'

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().selectElement(null)
  useDesign.getState().setSnap(true)
})

// ── Add buttons ───────────────────────────────────────────────────────────────

test('renders all four Add buttons', () => {
  render(<ComposerRail />)
  expect(screen.getByLabelText('Add text element')).toBeTruthy()
  expect(screen.getByLabelText('Add image element')).toBeTruthy()
  expect(screen.getByLabelText('Add shape element')).toBeTruthy()
  expect(screen.getByLabelText('Add line element')).toBeTruthy()
})

test('clicking "+ Text" calls addElement with "text"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add text element'))
  expect(addElement).toHaveBeenCalledWith('text')
})

test('clicking "+ Image" calls addElement with "image"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add image element'))
  expect(addElement).toHaveBeenCalledWith('image')
})

test('clicking "+ Shape" calls addElement with "block"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add shape element'))
  expect(addElement).toHaveBeenCalledWith('block')
})

test('clicking "+ Line" calls addElement with "line"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add line element'))
  expect(addElement).toHaveBeenCalledWith('line')
})

// ── Layers list ───────────────────────────────────────────────────────────────

test('layers list renders a row per slot', () => {
  const { container } = render(<ComposerRail />)
  const slotCount = useDesign.getState().design.slots.length
  const rows = container.querySelectorAll('[data-layer-row]')
  expect(rows.length).toBe(slotCount)
})

test('clicking a layer row selects that element', () => {
  const { container } = render(<ComposerRail />)
  const firstRow = container.querySelector('[data-layer-row]') as HTMLElement
  const slotId = firstRow.getAttribute('data-layer-row')!
  fireEvent.click(firstRow)
  expect(useDesign.getState().selectedId).toBe(slotId)
})

// ── Generation buttons (in Sidebar/LayoutGrid, not Rail, but test them here) ─
// These are actually in LayoutGrid; test them via a lightweight spy approach.

// ── Snap toggle ───────────────────────────────────────────────────────────────

test('snap checkbox reflects store snap (defaults true)', () => {
  const { container } = render(<ComposerRail />)
  const checkbox = container.querySelector('[data-rail-checkbox="rail-snap"]') as HTMLInputElement
  expect(checkbox.checked).toBe(true)
})

test('clicking snap checkbox calls setSnap with toggled value', () => {
  const setSnap = vi.spyOn(useDesign.getState(), 'setSnap')
  render(<ComposerRail />)
  const label = screen.getByLabelText('Snap to grid')
  fireEvent.click(label)
  expect(setSnap).toHaveBeenCalledWith(false)
})

// ── Selected element panel ────────────────────────────────────────────────────

test('empty state shown when nothing selected', () => {
  render(<ComposerRail />)
  expect(screen.getByText('Select an element on the canvas to edit it.')).toBeTruthy()
})

test('selecting a text element shows align buttons', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Align left')).toBeTruthy()
  expect(screen.getByLabelText('Align center')).toBeTruthy()
  expect(screen.getByLabelText('Align right')).toBeTruthy()
})

test('align left button calls setText with align:left', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setText = vi.spyOn(useDesign.getState(), 'setText')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align left'))
  expect(setText).toHaveBeenCalledWith(textSlot.id, { align: 'left' })
})
```

- [ ] **Step 12.2: Run ComposerRail tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerRail.test.tsx
```

Expected: all tests pass. If any fail, fix the corresponding component code.

- [ ] **Step 12.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 12.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/ComposerRail.test.tsx && git commit -m "test(ui): ComposerRail — add buttons, layers, snap toggle, selected panel"
```

---

## Task 13: Generation button tests in LayoutGrid

**Files:**
- Create: `src/ui/sidebar/LayoutGrid.test.tsx`

The three buttons must each call their distinct store action. Test this directly.

- [ ] **Step 13.1: Create test file**

```typescript
// src/ui/sidebar/LayoutGrid.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayoutGrid } from './LayoutGrid'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().setLayout(1)
})

test('Shuffle button calls shuffle()', () => {
  const shuffle = vi.spyOn(useDesign.getState(), 'shuffle')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Rearrange this layout'))
  expect(shuffle).toHaveBeenCalled()
})

test('Pick for me button calls pickForMe()', () => {
  const pickForMe = vi.spyOn(useDesign.getState(), 'pickForMe')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Jump to a random preset layout'))
  expect(pickForMe).toHaveBeenCalled()
})

test('Surprise me button calls surprise()', () => {
  const surprise = vi.spyOn(useDesign.getState(), 'surprise')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Generate a brand-new unique design'))
  expect(surprise).toHaveBeenCalled()
})

test('three buttons are visually distinct — Surprise has primary class', () => {
  const { container } = render(<LayoutGrid />)
  const surpriseBtn = container.querySelector('[title="Generate a brand-new unique design"]')
  expect(surpriseBtn?.className).toContain('bg-neutral-900')
})

test('microcopy helper is rendered', () => {
  render(<LayoutGrid />)
  expect(screen.getByText(/Shuffle reworks this layout/i)).toBeTruthy()
})
```

- [ ] **Step 13.2: Run generation button tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/LayoutGrid.test.tsx
```

Expected: all pass.

- [ ] **Step 13.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 13.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/sidebar/LayoutGrid.test.tsx && git commit -m "test(ui): generation buttons each call distinct store action"
```

---

## Task 14: Segmented format control test

**Files:**
- Create: `src/ui/sidebar/CanvasChips.test.tsx`

- [ ] **Step 14.1: Create test file**

```typescript
// src/ui/sidebar/CanvasChips.test.tsx
import { beforeEach, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasChips } from './CanvasChips'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().setFormat('4:5')
})

test('renders all 7 format options', () => {
  render(<CanvasChips />)
  for (const f of ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']) {
    expect(screen.getByText(f)).toBeTruthy()
  }
})

test('active format segment has bg-neutral-900 class', () => {
  render(<CanvasChips />)
  const activeBtn = screen.getByText('4:5').closest('button')
  expect(activeBtn?.className).toContain('bg-neutral-900')
})

test('clicking 1:1 sets format to 1:1', () => {
  render(<CanvasChips />)
  fireEvent.click(screen.getByText('1:1'))
  expect(useDesign.getState().design.format).toBe('1:1')
})

test('segmented control has radiogroup role', () => {
  const { container } = render(<CanvasChips />)
  expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
})
```

- [ ] **Step 14.2: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/CanvasChips.test.tsx
```

Expected: all pass.

- [ ] **Step 14.3: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all pass.

- [ ] **Step 14.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add src/ui/sidebar/CanvasChips.test.tsx && git commit -m "test(ui): segmented format control switches format, has radiogroup role"
```

---

## Task 15: Custom checkbox test

**Files:**
- Modify: `src/ui/sidebar/Sidebar.test.tsx` (update the existing style checkbox test)

The existing test finds by `getByLabelText('Film grain')` — this still works since our custom checkbox uses a `<label htmlFor="sc-filmGrain">`. No change needed to the test itself; verify it still passes.

- [ ] **Step 15.1: Run existing sidebar tests to confirm they still pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/Sidebar.test.tsx
```

Expected: all 5 sidebar tests pass without modification.

If the `getByLabelText` call fails because `getByLabelText` returns the label element rather than the input, update the test to `getByLabelText('Film grain', { selector: 'input' })`:

```typescript
// In Sidebar.test.tsx, update the style checkbox test:
test('style checkbox toggles design.style', () => {
  render(<Sidebar svgRef={svgRef} />)
  const filmGrainInput = screen.getByLabelText('Film grain', { selector: 'input' }) as HTMLInputElement
  const before = useDesign.getState().design.style.filmGrain
  fireEvent.click(filmGrainInput)
  expect(useDesign.getState().design.style.filmGrain).toBe(!before)
})
```

- [ ] **Step 15.2: Full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 15.3: Build check**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build
```

Expected: clean build, zero TypeScript errors.

- [ ] **Step 15.4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add -A && git commit -m "test(ui): verify custom checkbox sidebar tests pass after Phase D"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Task that covers it |
|-----------------|---------------------|
| Custom dropzone (ImageInput) | Task 3 |
| Custom checkboxes (StyleControls) | Task 4 |
| Styled slider (shadcn) | Task 6 |
| Segmented format control | Task 5 |
| Styled accent swatch | Task 4 |
| Refined palette swatches h-9 w-9 ring-2 | Task 4 |
| Three distinct generation buttons + microcopy | Task 7 |
| ComposerRail with Add group | Task 9 |
| ComposerRail Layers list | Task 9 |
| ComposerRail selected-element panel | Task 9 |
| Snap to grid toggle (rail) | Task 9 |
| Lift snap into store | Task 1 + 2 |
| Remove snap checkbox from CanvasStage | Task 2 |
| BottomBar "Generated — unique" / "Layout N — name" | Task 8 |
| BottomBar Prev/Next with lucide icons | Task 8 |
| BottomBar remove Free-mode toggle | Task 8 |
| 3-column App layout | Task 10 |
| Delete EditOverlay + FreeOverlay + EditOverlay.test | Task 11 |
| Tests: ComposerRail Add buttons | Task 12 |
| Tests: Layers list shows rows, click selects | Task 12 |
| Tests: three generation buttons call distinct actions | Task 13 |
| Tests: custom checkbox toggles setStyle | Task 15 |
| Tests: segmented format control switches format | Task 14 |
| `pnpm vitest run` all green | Task 15 |
| `pnpm build` clean | Task 15 |

**setFill:** Added in Task 9.1 before it's used. ✓

**lucide icon refs on SVG elements:** Noted in Task 7.2 with fallback pattern. ✓

**`slotBox` export check:** Verified in Task 9.3. ✓

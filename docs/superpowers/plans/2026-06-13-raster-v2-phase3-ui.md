# Raster v2 Phase 3 — UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing top-bar + right-sidebar layout with a white scrollable left sidebar (~360px) + grey canvas stage + bottom bar, using a Swiss editorial aesthetic.

**Architecture:** Seven sidebar sub-components live under `src/ui/sidebar/`, each self-contained and receiving store hooks directly. `Sidebar.tsx` composes them vertically. `App.tsx` owns `svgRef` and passes it down. Old components (`FormatSwitcher`, `ArchetypePicker`, `PalettePicker`, `SlotInspector`, `Toolbar`) are deleted and their test files removed.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 4, shadcn primitives (Button, Slider, Select), Vitest + Testing Library.

---

## File Map

### Files to CREATE
- `src/ui/sidebar/Header.tsx` — brand title + tagline
- `src/ui/sidebar/LayoutGrid.tsx` — 19-cell numbered grid + Shuffle/Surprise buttons
- `src/ui/sidebar/CanvasChips.tsx` — format pill buttons
- `src/ui/sidebar/ContentFields.tsx` — text slot textareas + image upload
- `src/ui/sidebar/TypographyControls.tsx` — typeface select + 5 sliders
- `src/ui/sidebar/StyleControls.tsx` — palette swatches + accent picker + checkboxes
- `src/ui/sidebar/ExportControls.tsx` — PNG / JPG / SVG export buttons
- `src/ui/Sidebar.tsx` — composes all 7 sub-components
- `src/ui/BottomBar.tsx` — layout name + prev/next
- `src/ui/sidebar/Sidebar.test.tsx` — smoke + interaction tests for the sidebar

### Files to MODIFY
- `src/ui/App.tsx` — rewire layout to column flex with left sidebar + right canvas + bottom bar

### Files to DELETE
- `src/ui/FormatSwitcher.tsx`
- `src/ui/ArchetypePicker.tsx`
- `src/ui/PalettePicker.tsx`
- `src/ui/SlotInspector.tsx`
- `src/ui/SlotInspector.test.tsx`
- `src/ui/Toolbar.tsx`

### Files to KEEP UNCHANGED
- `src/ui/CanvasStage.tsx`
- `src/ui/CanvasStage.test.tsx`
- `src/ui/FreeOverlay.tsx`
- `src/ui/ImageInput.tsx`
- `src/ui/components/` (all shadcn primitives)
- `src/ui/lib/cn.ts`

---

## Task 1: Create sidebar sub-directory + Header

**Files:**
- Create: `src/ui/sidebar/Header.tsx`

- [ ] **Step 1: Create the `sidebar/` directory and write `Header.tsx`**

```tsx
// src/ui/sidebar/Header.tsx
export function Header() {
  return (
    <div className="sb-section">
      <div className="text-lg font-bold tracking-tight text-neutral-900">Raster</div>
      <div className="mt-0.5 text-xs text-neutral-500">
        Typography · Grids · Foundation · Design
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls /Users/mymac/Documents/Work/raster/src/ui/sidebar/Header.tsx
```

Expected: file listed.

---

## Task 2: LayoutGrid component

**Files:**
- Create: `src/ui/sidebar/LayoutGrid.tsx`

- [ ] **Step 1: Write `LayoutGrid.tsx`**

```tsx
// src/ui/sidebar/LayoutGrid.tsx
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffle = useDesign(s => s.shuffle)
  const surprise = useDesign(s => s.surprise)

  return (
    <div className="sb-section space-y-3">
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
              'transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
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
      <div className="flex gap-2">
        <button
          onClick={shuffle}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          ⇄ Shuffle
        </button>
        <button
          onClick={surprise}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          ✦ Surprise
        </button>
      </div>
    </div>
  )
}
```

---

## Task 3: CanvasChips component

**Files:**
- Create: `src/ui/sidebar/CanvasChips.tsx`

- [ ] **Step 1: Write `CanvasChips.tsx`**

```tsx
// src/ui/sidebar/CanvasChips.tsx
import type { Format } from '../../types'
import { useDesign } from '../../store/useDesign'

const FORMAT_ORDER: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CanvasChips() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)

  return (
    <div className="sb-section flex flex-wrap gap-1.5">
      {FORMAT_ORDER.map(f => (
        <button
          key={f}
          onClick={() => setFormat(f)}
          className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            'transition-colors duration-[160ms]',
            format === f
              ? 'bg-neutral-900 text-white'
              : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400',
          ].join(' ')}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
```

---

## Task 4: ContentFields component

**Files:**
- Create: `src/ui/sidebar/ContentFields.tsx`

- [ ] **Step 1: Write `ContentFields.tsx`**

The label humanizer splits camelCase into words separated by spaces, uppercases the result. E.g. `imageCap` → "IMAGE CAP", `footerMark` → "FOOTER MARK", `metaA` → "META A".

```tsx
// src/ui/sidebar/ContentFields.tsx
import { useDesign } from '../../store/useDesign'
import { ImageInput } from '../ImageInput'

function humanize(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toUpperCase()
}

export function ContentFields() {
  const design = useDesign(s => s.design)
  const setContent = useDesign(s => s.setContent)

  const textSlots = design.slots.filter(
    s => s.role !== 'image' && s.role !== 'block',
  )
  const imageSlot = design.slots.find(s => s.role === 'image')

  return (
    <div className="sb-section space-y-4">
      {textSlots.map(slot => (
        <div key={slot.id} className="space-y-1">
          <label
            htmlFor={`cf-${slot.id}`}
            className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            {humanize(slot.id)}
          </label>
          <textarea
            id={`cf-${slot.id}`}
            aria-label={humanize(slot.id)}
            value={slot.content}
            onChange={e => setContent(slot.id, e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      ))}

      {imageSlot && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Image
          </div>
          <ImageInput slotId={imageSlot.id} />
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Tip — click any text on the poster to edit it in place. Click or drop an image onto the photo frame.
      </p>
    </div>
  )
}
```

---

## Task 5: TypographyControls component

**Files:**
- Create: `src/ui/sidebar/TypographyControls.tsx`

- [ ] **Step 1: Write `TypographyControls.tsx`**

Uses the shadcn `Slider` at `src/ui/components/slider.tsx` (wraps `@radix-ui/react-slider`). The Slider receives `value` as an array (`[n]`) and `onValueChange` receives `[n]`.

```tsx
// src/ui/sidebar/TypographyControls.tsx
import { useDesign } from '../../store/useDesign'
import { Slider } from '../components/slider'
import type { FontFamily } from '../../types'

const TYPEFACE_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'display', label: 'Archivo Display' },
  { value: 'sans', label: 'Inter' },
  { value: 'condensed', label: 'Archivo Narrow' },
  { value: 'mono', label: 'Space Mono' },
]

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-xs text-neutral-500">{label}</div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <div className="w-12 text-right text-xs tabular-nums text-neutral-600">
        {step < 0.01 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : value}
      </div>
    </div>
  )
}

export function TypographyControls() {
  const typography = useDesign(s => s.design.typography)
  const setTypography = useDesign(s => s.setTypography)

  return (
    <div className="sb-section space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="tc-typeface"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Typeface
        </label>
        <select
          id="tc-typeface"
          value={typography.typeface}
          onChange={e => setTypography({ typeface: e.target.value as FontFamily })}
          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        >
          {TYPEFACE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        <SliderRow
          label="Title"
          value={typography.title}
          min={40} max={320} step={1}
          onChange={v => setTypography({ title: v })}
        />
        <SliderRow
          label="Headline"
          value={typography.headline}
          min={40} max={400} step={1}
          onChange={v => setTypography({ headline: v })}
        />
        <SliderRow
          label="Body"
          value={typography.body}
          min={10} max={48} step={1}
          onChange={v => setTypography({ body: v })}
        />
        <SliderRow
          label="Tracking"
          value={typography.tracking}
          min={-0.1} max={0.1} step={0.005}
          onChange={v => setTypography({ tracking: v })}
        />
        <SliderRow
          label="Leading"
          value={typography.leading}
          min={0.8} max={1.6} step={0.01}
          onChange={v => setTypography({ leading: v })}
        />
      </div>

      <p className="text-xs text-neutral-400">
        Tracking and leading shape the display type (title + headline).
      </p>
    </div>
  )
}
```

---

## Task 6: StyleControls component

**Files:**
- Create: `src/ui/sidebar/StyleControls.tsx`

- [ ] **Step 1: Write `StyleControls.tsx`**

Each `PRESET_PALETTES` entry has `{ name, palette: { bg, text, accent } }`. A swatch is a small button showing the bg color with an inner accent square. The selected swatch = the palette whose `bg+text+accent` all match the current `design.palette`.

```tsx
// src/ui/sidebar/StyleControls.tsx
import { useDesign } from '../../store/useDesign'
import { PRESET_PALETTES } from '../../design/palettes'

export function StyleControls() {
  const palette = useDesign(s => s.design.palette)
  const style = useDesign(s => s.design.style)
  const setPalette = useDesign(s => s.setPalette)
  const setAccent = useDesign(s => s.setAccent)
  const setStyle = useDesign(s => s.setStyle)

  const isSelectedPalette = (p: { bg: string; text: string; accent: string }) =>
    p.bg === palette.bg && p.text === palette.text && p.accent === palette.accent

  return (
    <div className="sb-section space-y-4">
      {/* Palette swatches */}
      <div className="space-y-1">
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
                'h-8 w-8 rounded-md border overflow-hidden relative',
                'transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'active:scale-[0.97]',
                isSelectedPalette(p.palette)
                  ? 'ring-2 ring-neutral-900 ring-offset-1'
                  : 'border-neutral-200 hover:border-neutral-400',
              ].join(' ')}
              style={{ background: p.palette.bg }}
            >
              <span
                className="absolute bottom-1 right-1 block h-2 w-2 rounded-sm"
                style={{ background: p.palette.accent }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour picker */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="sc-accent"
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Accent colour
        </label>
        <input
          id="sc-accent"
          type="color"
          value={palette.accent}
          onChange={e => setAccent(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {(
          [
            { key: 'accentHeadline', label: 'Accent the headline' },
            { key: 'bwImage', label: 'Black & white image' },
            { key: 'filmGrain', label: 'Film grain' },
            { key: 'gridOverlay', label: 'Show grid overlay' },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={style[key]}
              onChange={e => setStyle({ [key]: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}
```

---

## Task 7: ExportControls component

**Files:**
- Create: `src/ui/sidebar/ExportControls.tsx`

- [ ] **Step 1: Write `ExportControls.tsx`**

Takes `svgRef` as a prop. Uses `exportRaster` and `exportSvg` from `src/export/useExport.ts`.

```tsx
// src/ui/sidebar/ExportControls.tsx
import type React from 'react'
import { useDesign } from '../../store/useDesign'
import { exportRaster, exportSvg } from '../../export/useExport'

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ExportControls({ svgRef }: ExportControlsProps) {
  const design = useDesign(s => s.design)
  const name = `raster-${design.layout}`

  const run = (fn: (el: SVGSVGElement) => void) => {
    if (svgRef.current) fn(svgRef.current)
  }

  return (
    <div className="sb-section flex gap-2">
      <button
        onClick={() => run(el => exportRaster(el, design, name, 'image/png'))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        PNG
      </button>
      <button
        onClick={() => run(el => exportRaster(el, design, name, 'image/jpeg'))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        JPG
      </button>
      <button
        onClick={() => run(el => exportSvg(el, name))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        SVG
      </button>
    </div>
  )
}
```

---

## Task 8: Sidebar.tsx composer

**Files:**
- Create: `src/ui/Sidebar.tsx`

- [ ] **Step 1: Write `Sidebar.tsx`**

The section label is a shared micro-label style: `text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2 mt-6`. Each section is wrapped in a `div` with class `sb-section` so Phase 5 GSAP stagger hooks can target `.sb-section` elements. The `Header` has no label.

```tsx
// src/ui/Sidebar.tsx
import type React from 'react'
import { Header } from './sidebar/Header'
import { LayoutGrid } from './sidebar/LayoutGrid'
import { CanvasChips } from './sidebar/CanvasChips'
import { ContentFields } from './sidebar/ContentFields'
import { TypographyControls } from './sidebar/TypographyControls'
import { StyleControls } from './sidebar/StyleControls'
import { ExportControls } from './sidebar/ExportControls'

interface SidebarProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2 mt-6">
      {children}
    </div>
  )
}

export function Sidebar({ svgRef }: SidebarProps) {
  return (
    <aside className="w-[360px] shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
      <div className="p-5">
        <Header />

        <SectionLabel>Layout</SectionLabel>
        <LayoutGrid />

        <SectionLabel>Canvas</SectionLabel>
        <CanvasChips />

        <SectionLabel>Content</SectionLabel>
        <ContentFields />

        <SectionLabel>Typography</SectionLabel>
        <TypographyControls />

        <SectionLabel>Style</SectionLabel>
        <StyleControls />

        <SectionLabel>Export</SectionLabel>
        <ExportControls svgRef={svgRef} />
      </div>
    </aside>
  )
}
```

---

## Task 9: BottomBar component

**Files:**
- Create: `src/ui/BottomBar.tsx`

- [ ] **Step 1: Write `BottomBar.tsx`**

Looks up the layout name from `LAYOUTS` using `design.layout`. Falls back to an empty string if somehow not found (shouldn't happen after Phase 1).

```tsx
// src/ui/BottomBar.tsx
import { useDesign } from '../store/useDesign'
import { LAYOUTS } from '../design/layouts'

export function BottomBar() {
  const design = useDesign(s => s.design)
  const prevLayout = useDesign(s => s.prevLayout)
  const nextLayout = useDesign(s => s.nextLayout)
  const setMode = useDesign(s => s.setMode)

  const layoutDef = LAYOUTS.find(l => l.n === design.layout)
  const layoutName = layoutDef?.name ?? ''

  return (
    <div className="border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between text-sm">
      <div className="text-neutral-500">
        Layout{' '}
        <span className="font-semibold tabular-nums text-neutral-900">{design.layout}</span>
        {' — '}
        <span className="text-neutral-700">{layoutName}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode(design.mode === 'free' ? 'grid' : 'free')}
          className={[
            'rounded border px-2.5 py-1 text-xs font-medium',
            design.mode === 'free'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
          ].join(' ')}
        >
          {design.mode === 'free' ? 'Free ✕' : 'Free'}
        </button>

        <div className="flex gap-1">
          <button
            onClick={prevLayout}
            className="rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 active:scale-[0.97] transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
          >
            ← Prev
          </button>
          <button
            onClick={nextLayout}
            className="rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 active:scale-[0.97] transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 10: Rewire App.tsx

**Files:**
- Modify: `src/ui/App.tsx`

- [ ] **Step 1: Replace `App.tsx` entirely**

Remove all old imports (Toolbar, FormatSwitcher, ArchetypePicker, PalettePicker, SlotInspector). Import Sidebar, CanvasStage, BottomBar.

```tsx
// src/ui/App.tsx
import { useRef } from 'react'
import { Sidebar } from './Sidebar'
import { CanvasStage } from './CanvasStage'
import { BottomBar } from './BottomBar'
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
      </div>
      <BottomBar />
    </div>
  )
}
```

---

## Task 11: Delete obsolete components

**Files:**
- Delete: `src/ui/FormatSwitcher.tsx`
- Delete: `src/ui/ArchetypePicker.tsx`
- Delete: `src/ui/PalettePicker.tsx`
- Delete: `src/ui/SlotInspector.tsx`
- Delete: `src/ui/SlotInspector.test.tsx`
- Delete: `src/ui/Toolbar.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm /Users/mymac/Documents/Work/raster/src/ui/FormatSwitcher.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/ArchetypePicker.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/PalettePicker.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/SlotInspector.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/SlotInspector.test.tsx
rm /Users/mymac/Documents/Work/raster/src/ui/Toolbar.tsx
```

- [ ] **Step 2: Verify deletion**

```bash
ls /Users/mymac/Documents/Work/raster/src/ui/*.tsx
```

Expected: Only `App.tsx`, `BottomBar.tsx`, `CanvasStage.tsx`, `CanvasStage.test.tsx`, `FreeOverlay.tsx`, `ImageInput.tsx`, `Sidebar.tsx` remain (plus the `sidebar/` subdirectory and `components/`).

---

## Task 12: Write sidebar tests

**Files:**
- Create: `src/ui/sidebar/Sidebar.test.tsx`

- [ ] **Step 1: Write the test file**

These tests are smoke + interaction. They reset store state before each test to avoid cross-test bleed.

```tsx
// src/ui/sidebar/Sidebar.test.tsx
import { beforeEach, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'
import React from 'react'

const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>

beforeEach(() => {
  useDesign.getState().setLayout(1)
})

test('renders all 19 layout cells', () => {
  render(<Sidebar svgRef={svgRef} />)
  // Each cell shows its number as text
  for (let n = 1; n <= 19; n++) {
    expect(screen.getAllByText(String(n)).length).toBeGreaterThan(0)
  }
})

test('clicking layout cell 3 changes design.layout to 3', () => {
  render(<Sidebar svgRef={svgRef} />)
  // Find the button whose accessible text is "3" inside the layout grid
  const cells = screen.getAllByText('3')
  // The layout grid button is a <button> element
  const cell = cells.find(el => el.tagName === 'BUTTON')
  expect(cell).toBeTruthy()
  fireEvent.click(cell!)
  expect(useDesign.getState().design.layout).toBe(3)
})

test('content textarea edits slot content', () => {
  useDesign.getState().setLayout(3) // mega-word has a 'word' slot
  render(<Sidebar svgRef={svgRef} />)
  // Look for any textarea (content field)
  const textareas = document.querySelectorAll('textarea')
  expect(textareas.length).toBeGreaterThan(0)
  const first = textareas[0] as HTMLTextAreaElement
  const slotIdBefore = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block',
  )?.id
  fireEvent.change(first, { target: { value: 'CHANGED' } })
  const slot = useDesign.getState().design.slots.find(s => s.id === slotIdBefore)
  expect(slot?.content).toBe('CHANGED')
})

test('style checkbox toggles design.style', () => {
  render(<Sidebar svgRef={svgRef} />)
  const filmGrainLabel = screen.getByLabelText('Film grain') as HTMLInputElement
  const before = useDesign.getState().design.style.filmGrain
  fireEvent.click(filmGrainLabel)
  expect(useDesign.getState().design.style.filmGrain).toBe(!before)
})
```

- [ ] **Step 2: Run only the new tests to verify they can be found (may fail until component files exist — that's expected)**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/Sidebar.test.tsx 2>&1 | tail -20
```

---

## Task 13: Full test run + build verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -30
```

Expected: All tests pass. The deleted `SlotInspector.test.tsx` is gone so its tests no longer run. `CanvasStage.test.tsx` still passes.

- [ ] **Step 2: TypeScript + Vite build**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -30
```

Expected: Clean build with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mymac/Documents/Work/raster && git add -A && git commit -m "$(cat <<'EOF'
feat(ui): Phase 3 — Swiss editorial sidebar, bottom bar, canvas stage

Replace top-bar + right-sidebar layout with white left sidebar (360px) +
grey canvas stage + bottom bar. Sidebar sections: Header, LayoutGrid (19
cells + Shuffle/Surprise), CanvasChips (7 formats), ContentFields (slot
textareas + image upload), TypographyControls (typeface select + 5
sliders), StyleControls (palette swatches + accent + 4 checkboxes),
ExportControls (PNG/JPG/SVG). BottomBar shows layout name + Prev/Next +
Free-mode toggle. Delete FormatSwitcher, ArchetypePicker, PalettePicker,
SlotInspector, Toolbar. Add Sidebar.test.tsx smoke/interaction tests.
EOF
)"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| White sidebar ~360px, left, scrollable | Task 8 (`w-[360px]`, `overflow-y-auto`, `bg-white`) |
| Grey canvas stage, poster centered + shadowed | Unchanged `CanvasStage.tsx` (`bg-neutral-200`, `shadow-2xl`) |
| Header title + tagline | Task 1 |
| LayoutGrid: 19 cells, selected black, hover lift | Task 2 |
| Shuffle ⇄ + Surprise ✦ buttons | Task 2 |
| CanvasChips format order: `3:4, A4, 4:5, 1:1, 2:3, 9:16, 16:9` | Task 3 |
| ContentFields: labeled textareas, image slot, tip text | Task 4 |
| TypographyControls: typeface + 5 sliders with value display | Task 5 |
| StyleControls: palette swatches + accent picker + 4 checkboxes | Task 6 |
| ExportControls: PNG/JPG/SVG | Task 7 |
| Sidebar sections with uppercase micro-labels + `sb-section` class | Task 8 |
| BottomBar: layout name + Prev/Next | Task 9 |
| Free-mode toggle preserved | Task 9 (BottomBar corner button) |
| App.tsx rewired: left sidebar + right main + bottom bar | Task 10 |
| Delete obsolete components | Task 11 |
| Tests: 19 cells, click cell 3, textarea edits slot, checkbox toggles | Task 12 |
| pnpm build clean + all tests pass | Task 13 |
| Button `:active` scale 0.97, transition cubic-bezier | All button components |
| Layout cell hover: `-translate-y-px shadow-sm` | Task 2 |
| `tabular-nums` on slider values | Task 5 |
| `focus:ring-2 focus:ring-neutral-900/10` on inputs | Tasks 4, 5, 6 |
| No `transition: all` | All components (specific properties only) |
| `sb-section` class on each section content div | Tasks 1–7 |
| `name = raster-${design.layout}` for export | Task 7 |

### Placeholder scan
None found. All steps include complete code.

### Type consistency
- `svgRef: React.RefObject<SVGSVGElement | null>` — consistent across `ExportControls`, `Sidebar`, `App`.
- `FontFamily` imported from `../../types` in `TypographyControls` — consistent with store's `setTypography`.
- `Format` imported from `../../types` in `CanvasChips` — consistent with store's `setFormat`.
- `PRESET_PALETTES` spread with `{ ...p.palette }` in `StyleControls` — matches store's `setPalette(p: Palette)` signature.
- `setStyle({ [key]: e.target.checked })` — `key` is typed `as const` from the array, so Partial<StyleOptions> keys are valid.

### Potential concerns
1. **`getByLabelText('Film grain')` in tests**: The checkbox uses a wrapping `<label>` with the text as its child, not an `htmlFor`/`id` pair. Testing Library resolves `getByLabelText` for wrapping labels too — this will work.
2. **`screen.getAllByText('3')`** in the layout cell test: the number "3" may appear in format chip "2:3". The test filters for `tagName === 'BUTTON'` to disambiguate, but "3" alone won't match "2:3". This is safe.
3. **`sb-section` class on Header**: The spec says the Header gets no section label, but its content div should still carry `sb-section` for Phase 5 stagger — included in all sub-components.
4. **StyleControls `isSelectedPalette`**: `PRESET_PALETTES` has two entries with identical values (`Black / White` and `Red / Black` both have the same bg/text/accent). Both will show the selected ring simultaneously. This matches the data as-is; the user can fix the palette data if desired — not a Phase 3 concern.

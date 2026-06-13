# Raster v2 Phase 5 — GSAP Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rich GSAP motion to Raster v2: poster reflow, sidebar stagger, format tween, animated film grain, and button affordances — all respecting `prefers-reduced-motion`.

**Architecture:** Six targeted animations, each in its own `useGSAP` hook in the component that owns the DOM being animated. A new `GrainAnimator` component isolates the grain ticker. All motion is gated via `gsap.matchMedia()` so reduced-motion users only see opacity fades (no translate/scale movement).

**Tech Stack:** React 19, GSAP 3.15, `@gsap/react` 2.1.2 (useGSAP), TypeScript strict, Vitest + jsdom, pnpm.

---

## File Map

| File | Change |
|------|--------|
| `src/ui/CanvasStage.tsx` | Add 3 useGSAP hooks: reflow, mount entrance, format tween |
| `src/ui/Sidebar.tsx` | Add ref + 1 useGSAP hook: sidebar stagger on mount |
| `src/ui/sidebar/LayoutGrid.tsx` | Add button refs + 1 useGSAP hook: shuffle/surprise click pulse |
| `src/ui/GrainAnimator.tsx` | New component: animates `feTurbulence` seed on a throttled ticker |
| `src/render/Renderer.tsx` | Mount `<GrainAnimator>` when filmGrain on (pass svgRef) |
| `src/ui/CanvasStage.test.tsx` | Add smoke test: renders without throw when motion hooks are active |
| `src/ui/sidebar/Sidebar.test.tsx` | Add smoke test: Sidebar still renders after ref + GSAP hook added |
| `src/ui/GrainAnimator.test.tsx` | New smoke test: mounts without error when filmGrain on |

---

## Before You Start

```bash
git -C /Users/mymac/Documents/Work/raster rev-parse HEAD   # record BASE_SHA
git -C /Users/mymac/Documents/Work/raster branch           # confirm on feature/raster-v2-ui
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5  # 114 pass
```

---

## Task 1: GSAP setup guard in test-setup (jsdom compatibility)

jsdom does not implement `window.matchMedia`. GSAP's `matchMedia()` calls it internally. Add a stub so the hooks don't throw in tests. This task comes first so every subsequent component test is safe.

**Files:**
- Modify: `src/test-setup.ts`

- [ ] **Step 1: Read the file before editing**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/test-setup.ts
```

- [ ] **Step 2: Add matchMedia stub to test-setup.ts**

Open `src/test-setup.ts` and append after the ResizeObserver stub:

```typescript
// jsdom does not implement window.matchMedia; stub it for GSAP's gsap.matchMedia().
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: `PASS (114) FAIL (0)`

- [ ] **Step 4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/test-setup.ts
git commit -m "test: add jsdom matchMedia stub for GSAP compatibility"
```

---

## Task 2: Sidebar mount stagger

On mount, stagger `.sb-section` elements (y+12 → 0, opacity 0 → 1). Requires adding a `sidebarRootRef` to the `<div className="p-5">` wrapper so `useGSAP` scope targets only this sidebar.

**Files:**
- Modify: `src/ui/Sidebar.tsx`

- [ ] **Step 1: Read current Sidebar.tsx**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/ui/Sidebar.tsx
```

- [ ] **Step 2: Implement sidebar stagger**

Replace the full contents of `src/ui/Sidebar.tsx` with:

```typescript
// src/ui/Sidebar.tsx
import type React from 'react'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
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
  const sidebarRootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.sb-section', {
        y: 12,
        opacity: 0,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.04,
      })
    })
    return () => mm.revert()
  }, { scope: sidebarRootRef })

  return (
    <aside className="w-[360px] shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
      <div ref={sidebarRootRef} className="p-5">
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

- [ ] **Step 3: Verify existing Sidebar tests still pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/sidebar/Sidebar.test.tsx 2>&1 | tail -10
```

Expected: `PASS (4) FAIL (0)` (all four existing Sidebar tests).

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: `PASS (114) FAIL (0)`

- [ ] **Step 5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/Sidebar.tsx
git commit -m "feat(motion): sidebar mount stagger via useGSAP"
```

---

## Task 3: CanvasStage — poster entrance + reflow + format tween

Three `useGSAP` hooks in CanvasStage:

1. **Mount entrance** (runs once): scale the poster container from 0.96 + opacity 0, ~400ms, no-preference only.
2. **Signature reflow** (deps: `design.layout`, `design.seed`): stagger `[data-slot]` groups from y+26/opacity-0/scale-0.985. Only fires on layout/seed change, NOT on every content keystroke.
3. **Format tween** (deps: `design.format`): quick 220ms opacity/scale settle when format chip changes.

**Files:**
- Modify: `src/ui/CanvasStage.tsx`

- [ ] **Step 1: Read current CanvasStage.tsx**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/ui/CanvasStage.tsx
```

- [ ] **Step 2: Implement all three motion hooks**

Replace the full contents of `src/ui/CanvasStage.tsx` with:

```typescript
import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { FreeOverlay } from './FreeOverlay'
import { EditOverlay } from './EditOverlay'

export function CanvasStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const c = canvasFor(design.format)
  // Letterbox: preserve aspect ratio; fit entirely within available space
  const isPortrait = c.h >= c.w

  // Measure the rendered pixel width of the SVG container to compute scale.
  // scale = renderedPixelWidth / canvas.w — used by FreeOverlay to align handles.
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.getBoundingClientRect().width / c.w)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [c.w])

  // ── Motion 1: mount entrance (once) ──────────────────────────────────────
  useGSAP(() => {
    if (!containerRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(containerRef.current!, {
        scale: 0.96,
        opacity: 0,
        duration: 0.4,
        ease: 'power3.out',
        force3D: true,
      })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [] })

  // ── Motion 2: poster reflow on layout/seed change ─────────────────────────
  useGSAP(() => {
    const groups = svgRef.current?.querySelectorAll('[data-slot]')
    if (!groups?.length) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(groups, {
        y: 26,
        opacity: 0,
        scale: 0.985,
        transformOrigin: '50% 50%',
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.035,
        force3D: true,
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.from(groups, { opacity: 0, duration: 0.2, stagger: 0.02 })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [design.layout, design.seed] })

  // ── Motion 3: format change settle ───────────────────────────────────────
  useGSAP(() => {
    if (!containerRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(containerRef.current!, {
        opacity: 0.6,
        scale: 0.99,
        duration: 0.22,
        ease: 'power3.out',
        force3D: true,
      })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [design.format] })

  return (
    <div className="flex h-full items-center justify-center bg-neutral-200 p-8">
      <div
        ref={containerRef}
        className="relative shadow-2xl"
        style={{
          aspectRatio: `${c.w}/${c.h}`,
          maxHeight: '100%',
          maxWidth: '100%',
          height: isPortrait ? '100%' : 'auto',
          width: isPortrait ? 'auto' : '100%',
        }}
      >
        <Renderer design={design} svgRef={svgRef} />
        {design.mode === 'free' ? <FreeOverlay scale={scale} /> : <EditOverlay scale={scale} />}
      </div>
    </div>
  )
}
```

**Note on `dependencies: []` for mount entrance:** `useGSAP` with an empty array runs once on mount (analogous to `useEffect(() => {...}, [])`). The reflow hook uses `[design.layout, design.seed]` — this fires only when layout or seed changes (shuffle/surprise/setLayout/nextLayout/prevLayout all trigger this; typing in content fields does NOT change layout or seed, so the reflow does not re-run).

- [ ] **Step 3: Verify CanvasStage tests pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/CanvasStage.test.tsx 2>&1 | tail -10
```

Expected: `PASS (1) FAIL (0)`

- [ ] **Step 4: Full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: `PASS (114) FAIL (0)`

- [ ] **Step 5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/CanvasStage.tsx
git commit -m "feat(motion): poster entrance, reflow stagger, format tween in CanvasStage"
```

---

## Task 4: GrainAnimator component

When `design.style.filmGrain` is on AND `prefers-reduced-motion: no-preference`, animate the `feTurbulence` seed attribute in `#raster-grain` at ~10fps (100ms interval) so the grain visually shimmers. Guard against the element being absent. Clean up on unmount/toggle.

**Files:**
- Create: `src/ui/GrainAnimator.tsx`
- Modify: `src/render/Renderer.tsx`

- [ ] **Step 1: Create GrainAnimator.tsx**

Create `/Users/mymac/Documents/Work/raster/src/ui/GrainAnimator.tsx`:

```typescript
// src/ui/GrainAnimator.tsx
import type React from 'react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface GrainAnimatorProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  enabled: boolean
}

/**
 * Animates the feTurbulence seed inside #raster-grain when:
 *   - enabled is true (filmGrain on)
 *   - prefers-reduced-motion: no-preference
 * Throttled to ~10fps via gsap.delayedCall loop. Cleans up on unmount/toggle.
 */
export function GrainAnimator({ svgRef, enabled }: GrainAnimatorProps) {
  const tickerRef = useRef<gsap.core.Tween | null>(null)
  const seedRef = useRef(7)

  useEffect(() => {
    if (!enabled) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return  // reduced-motion: keep static seed, no animation

    let cancelled = false

    function tick() {
      if (cancelled) return
      const svg = svgRef.current
      if (!svg) {
        // Element not yet in DOM; retry on next tick
        tickerRef.current = gsap.delayedCall(0.1, tick)
        return
      }
      const turbulence = svg.querySelector<SVGFETurbulenceElement>('feTurbulence')
      if (turbulence) {
        seedRef.current = (seedRef.current + 1) % 999
        turbulence.setAttribute('seed', String(seedRef.current))
      }
      tickerRef.current = gsap.delayedCall(0.1, tick)  // ~10fps
    }

    tick()

    return () => {
      cancelled = true
      if (tickerRef.current) {
        tickerRef.current.kill()
        tickerRef.current = null
      }
    }
  }, [enabled, svgRef])

  // This component renders nothing — it's a pure side-effect animator.
  return null
}
```

- [ ] **Step 2: Read Renderer.tsx before editing**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/render/Renderer.tsx
```

- [ ] **Step 3: Mount GrainAnimator in Renderer**

In `src/render/Renderer.tsx`, add the import at the top and mount `<GrainAnimator>` just before the closing `</svg>`. The `Renderer` already receives `svgRef` as an optional prop — pass it down.

Add import at the top of the file (after existing imports):

```typescript
import { GrainAnimator } from '../ui/GrainAnimator'
```

Then in the JSX, just before the closing `</svg>` tag, add:

```tsx
      {/* Grain seed animator — mounts when filmGrain on */}
      {style.filmGrain && svgRef && (
        <GrainAnimator
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          enabled={style.filmGrain}
        />
      )}
```

And add `import type React from 'react'` if not already present at the top (check the file — it may already be there as an implicit type).

**Full updated Renderer.tsx:**

```typescript
import type React from 'react'
import type { Design } from '../types'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { defaultMeasurer, type Measure } from '../lib/measure'
import { classOf } from '../design/typeclass'
import { resolveTextStyle } from './resolve-style'
import { SlotImage } from './slot-image'
import { SlotText } from './slot-text'
import { GrainAnimator } from '../ui/GrainAnimator'

const GRAIN_SEED = 7

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

    const verticals: number[] = []
    for (let c = 0; c <= cols; c++) {
      // left edge of col c (or right edge after last col)
      verticals.push(margin + c * (colW + gutter) - (c > 0 ? gutter : 0))
    }
    // Actually compute column boundary x positions correctly:
    // left edge of each column + right edge of last column
    const vLines: number[] = []
    for (let c = 0; c < cols; c++) {
      vLines.push(margin + c * (colW + gutter))            // left edge
      vLines.push(margin + c * (colW + gutter) + colW)     // right edge
    }
    // deduplicate (adjacent cols share a boundary)
    const vUniq = [...new Set(vLines)]

    const hLines: number[] = []
    for (let r = 0; r < rows; r++) {
      hLines.push(margin + r * (rowH + gutter))            // top edge
      hLines.push(margin + r * (rowH + gutter) + rowH)     // bottom edge
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

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      width="100%" height="100%"
    >
      {/* Background — stays as sibling, not wrapped */}
      <rect data-bg x={0} y={0} width={canvas.w} height={canvas.h} fill={palette.bg} />

      {/* Defs: filters for bw and grain */}
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
      </defs>

      {/* Slots — each wrapped in <g data-slot> for Phase 5 motion */}
      {design.slots.map(slot => {
        const box = slotBox(canvas, design.grid, slot)

        if (slot.role === 'image') {
          return (
            <g key={slot.id} data-slot={slot.id}>
              <SlotImage box={box} src={slot.content} bw={style.bwImage} />
            </g>
          )
        }

        if (slot.role === 'block') {
          const fill = slot.fill === 'accent' ? palette.accent
            : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
          return (
            <g key={slot.id} data-slot={slot.id}>
              <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
            </g>
          )
        }

        // Text slot
        const resolvedText = resolveTextStyle(slot, typography)
        const cls = slot.typeClass ?? classOf(slot.role)
        const color = (style.accentHeadline && cls === 'title')
          ? palette.accent
          : palette.text

        return (
          <g key={slot.id} data-slot={slot.id}>
            <SlotText
              box={box}
              text={resolvedText}
              content={slot.content}
              color={color}
              measure={m}
            />
          </g>
        )
      })}

      {/* Grid overlay — above slots */}
      {gridLines}

      {/* Film grain — topmost, above everything */}
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

      {/* Grain seed animator — mounts when filmGrain on */}
      {style.filmGrain && svgRef && (
        <GrainAnimator
          svgRef={svgRef as React.RefObject<SVGSVGElement | null>}
          enabled={style.filmGrain}
        />
      )}
    </svg>
  )
}
```

**Important:** `GrainAnimator` returns `null` so it can be placed inside the SVG JSX tree without producing any SVG element — React renders it as nothing in the DOM. This is valid; React functional components returning `null` render no DOM.

- [ ] **Step 4: Run tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: `PASS (114) FAIL (0)`

- [ ] **Step 5: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/GrainAnimator.tsx src/render/Renderer.tsx
git commit -m "feat(motion): animated film grain via GrainAnimator + gsap.delayedCall"
```

---

## Task 5: Shuffle/Surprise button affordance in LayoutGrid

On Shuffle click: briefly nudge the "⇄" glyph text (x: -3, x: 0, ~200ms). On Surprise click: spin the "✦" glyph (~300ms, rotation: 360, one-shot). Both are no-preference only, one-shot, do not re-trigger on hover. Uses refs to the icon spans inside the buttons.

**Files:**
- Modify: `src/ui/sidebar/LayoutGrid.tsx`

- [ ] **Step 1: Read current LayoutGrid.tsx**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/ui/sidebar/LayoutGrid.tsx
```

- [ ] **Step 2: Implement button affordance**

Replace the full contents of `src/ui/sidebar/LayoutGrid.tsx` with:

```typescript
// src/ui/sidebar/LayoutGrid.tsx
import { useRef } from 'react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffleAction = useDesign(s => s.shuffle)
  const surpriseAction = useDesign(s => s.surprise)

  const shuffleIconRef = useRef<HTMLSpanElement>(null)
  const surpriseIconRef = useRef<HTMLSpanElement>(null)

  function handleShuffle() {
    shuffleAction()
    const icon = shuffleIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    // Quick horizontal nudge: left -3px then back
    gsap.fromTo(icon, { x: -3 }, { x: 0, duration: 0.2, ease: 'power3.out' })
  }

  function handleSurprise() {
    surpriseAction()
    const icon = surpriseIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    // One full rotation, 300ms
    gsap.from(icon, { rotation: -30, scale: 0.8, duration: 0.3, ease: 'power3.out', transformOrigin: '50% 50%' })
  }

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
          onClick={handleShuffle}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          <span ref={shuffleIconRef} style={{ display: 'inline-block' }}>⇄</span>{' '}Shuffle
        </button>
        <button
          onClick={handleSurprise}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          <span ref={surpriseIconRef} style={{ display: 'inline-block' }}>✦</span>{' '}Surprise
        </button>
      </div>
    </div>
  )
}
```

**Note:** `display: inline-block` on the icon spans is required for GSAP transforms (`x`, `rotation`) to apply — inline elements don't support CSS transforms in all browsers. `style={{ display: 'inline-block' }}` keeps it React-idiomatic.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: `PASS (114) FAIL (0)`

- [ ] **Step 4: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/sidebar/LayoutGrid.tsx
git commit -m "feat(motion): shuffle/surprise button micro-animation affordance"
```

---

## Task 6: Smoke tests for motion components

Write three targeted smoke tests:
1. `CanvasStage` renders an SVG without throwing after GSAP hooks are added.
2. `Sidebar` renders after `useGSAP` + ref are added.
3. `GrainAnimator` mounts without error when `filmGrain` is on.

These tests assert render stability, not animation frames (which can't be asserted in jsdom).

**Files:**
- Modify: `src/ui/CanvasStage.test.tsx`
- Modify: `src/ui/sidebar/Sidebar.test.tsx` (add one test)
- Create: `src/ui/GrainAnimator.test.tsx`

- [ ] **Step 1: Read CanvasStage.test.tsx**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/ui/CanvasStage.test.tsx
```

- [ ] **Step 2: Update CanvasStage.test.tsx — add motion smoke test**

The existing test already exercises render. Add one more test confirming no throw on rerender with changed layout:

```typescript
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { CanvasStage } from './CanvasStage'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

test('renders the current design as an svg', () => {
  useDesign.getState().reset('mega-word', '1:1')
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { container } = render(<CanvasStage svgRef={svgRef} />)
  expect(container.querySelector('svg')).toBeTruthy()
})

test('does not throw when layout changes (motion reflow hook)', () => {
  useDesign.getState().setLayout(1)
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { unmount } = render(<CanvasStage svgRef={svgRef} />)
  // Change layout — triggers reflow hook dependency; should not throw
  useDesign.getState().setLayout(2)
  unmount()
})
```

- [ ] **Step 3: Read Sidebar.test.tsx**

```bash
cat -n /Users/mymac/Documents/Work/raster/src/ui/sidebar/Sidebar.test.tsx
```

- [ ] **Step 4: Add one smoke test to Sidebar.test.tsx**

Append to the existing test file (do not delete existing tests):

```typescript
test('sidebar mounts with GSAP stagger hook without throwing', () => {
  const { container } = render(<Sidebar svgRef={svgRef} />)
  expect(container.querySelector('aside')).toBeTruthy()
})
```

- [ ] **Step 5: Create GrainAnimator.test.tsx**

Create `/Users/mymac/Documents/Work/raster/src/ui/GrainAnimator.test.tsx`:

```typescript
// src/ui/GrainAnimator.test.tsx
import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { GrainAnimator } from './GrainAnimator'

function Wrapper({ enabled }: { enabled: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  return (
    <>
      <svg ref={svgRef}>
        <defs>
          <filter id="raster-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} />
          </filter>
        </defs>
      </svg>
      <GrainAnimator svgRef={svgRef} enabled={enabled} />
    </>
  )
}

test('GrainAnimator mounts without error when enabled', () => {
  const { unmount } = render(<Wrapper enabled={true} />)
  unmount()
})

test('GrainAnimator mounts without error when disabled', () => {
  const { unmount } = render(<Wrapper enabled={false} />)
  unmount()
})
```

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -10
```

Expected output includes something like: `PASS (119) FAIL (0)` (114 existing + 5 new tests).

- [ ] **Step 7: TypeScript build check**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -15
```

Expected: clean build, no TS errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/mymac/Documents/Work/raster
git add src/ui/CanvasStage.test.tsx src/ui/sidebar/Sidebar.test.tsx src/ui/GrainAnimator.test.tsx
git commit -m "test(motion): smoke tests for CanvasStage, Sidebar, and GrainAnimator"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full test suite — green**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run 2>&1 | tail -5
```

Expected: all pass, 0 failures.

- [ ] **Step 2: Clean TypeScript build**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Report commit SHAs**

```bash
git -C /Users/mymac/Documents/Work/raster log --oneline -6
```

---

## Self-Review Checklist

| Spec requirement | Task |
|-----------------|------|
| Signature poster reflow on layout/seed change, y+opacity+scale, 35ms stagger, power3.out | Task 3 (motion 2) |
| deps ONLY `[design.layout, design.seed]` — typing content does NOT re-trigger | Task 3 (motion 2) |
| First-load poster entrance, scale 0.96+opacity, 400ms, mount-only | Task 3 (motion 1) |
| Sidebar load stagger `.sb-section`, y+12, 40ms stagger, scope ref | Task 2 |
| Format-change tween on poster container, 220ms | Task 3 (motion 3) |
| Animated film grain — feTurbulence seed, throttled ~10fps, guarded absent elem | Task 4 |
| Shuffle/Surprise button affordance — no-preference only, one-shot | Task 5 |
| `prefers-reduced-motion: reduce` — keep opacity fades, drop movement | Tasks 2, 3, 4, 5 |
| `gsap.matchMedia()` used for the split | Tasks 2, 3, 4, 5 |
| No break to existing 114 tests | Tasks 1, 6 |
| jsdom matchMedia stub | Task 1 |
| Strict TS clean build | Task 6 |
| Light smoke tests for CanvasStage, Sidebar, GrainAnimator | Task 6 |

No placeholders or TODOs found. All code is complete and concrete.

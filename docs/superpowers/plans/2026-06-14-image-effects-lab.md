# Image Effects Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-image print treatments (halftone, duotone, dither, posterize, threshold, invert, grayscale) with live inspector controls, canvas pixel processing, and export-safe baked dataURLs.

**Architecture:** The processed result is a PNG dataURL stored in `slot.content` (existing render path — zero changes to SVG renderer or export). The source-of-truth is `slot.imageSrcOriginal` + `slot.imageEffect` (both in history); `content` is derived state updated by a debounced `useImageEffectProcessor` hook mounted in `CanvasStage`. Undoing an effect change restores the prior `imageEffect`, the hook re-processes, and `content` re-derives — no history pollution from the derived state write.

**Tech Stack:** React 19, Zustand, TypeScript strict, Vitest + jsdom, `@testing-library/react`, offscreen canvas (browser), Lucide icons, Tailwind utility classes.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types.ts` | Modify | Add `imageSrcOriginal?` and `imageEffect?` to `Slot` |
| `src/lib/image-effects.ts` | Create | Pure pixel helpers + `applyImageEffect` async orchestrator |
| `src/lib/image-effects.test.ts` | Create | Unit tests for pixel math helpers + async wrapper |
| `src/store/useDesign.ts` | Modify | Add `setImageEffect`, `setProcessedImage`, `placeImage` actions; update `load()` migration |
| `src/store/useDesign.test.ts` | Modify | Tests for new store actions |
| `src/ui/useImageEffectProcessor.ts` | Create | Hook: watches image slots, debounces, calls `applyImageEffect`, writes `setProcessedImage` |
| `src/ui/CanvasStage.tsx` | Modify | Mount `useImageEffectProcessor()` once |
| `src/ui/CropModal.tsx` | Modify | On Apply: call `placeImage` instead of `setContent` |
| `src/ui/ComposerRail.tsx` | Modify | Add EFFECTS section (kind chips + param controls) for image slots |
| `src/ui/ComposerRail.test.tsx` | Modify | Tests: EFFECTS chips appear for image slot; picking Halftone calls setImageEffect |

---

## Task 1: Extend `Slot` type with effects fields

**Files:**
- Modify: `src/types.ts`
- Test: `src/types.test.ts` (existing — just confirm it still compiles)

- [ ] **Step 1: Add the ImageEffect type and extend Slot**

Open `src/types.ts` and add after the `Shadow` interface and before `Slot`:

```typescript
export type ImageEffectKind =
  | 'none' | 'halftone' | 'duotone' | 'dither'
  | 'posterize' | 'threshold' | 'invert' | 'grayscale'

export interface ImageEffect {
  kind: ImageEffectKind
  params: Record<string, number | string>
}
```

Then add these two optional fields to the `Slot` interface, after the `blend?` field:

```typescript
  /**
   * Pristine source image (cropped/uploaded dataURL or external URL).
   * The processing SOURCE — never overwritten after initial placement.
   * effects always re-process from this, so they are idempotent.
   */
  imageSrcOriginal?: string
  /** Current image effect descriptor. source of truth for re-processing. */
  imageEffect?: ImageEffect
```

- [ ] **Step 2: Run existing type tests to confirm zero regressions**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/types.test.ts
```

Expected: all tests pass (the new optional fields don't break anything).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add ImageEffect type and imageSrcOriginal/imageEffect to Slot"
```

---

## Task 2: Pure pixel processor — `src/lib/image-effects.ts`

**Files:**
- Create: `src/lib/image-effects.ts`

No tests yet — write tests first in Task 3, then implement minimal code. But for this task the processor and helpers are tightly coupled, so we write the full implementation here and test it in Task 3.

- [ ] **Step 1: Create `src/lib/image-effects.ts`**

```typescript
// src/lib/image-effects.ts
//
// Canvas-based pixel processor for image effects.
// applyImageEffect is the async entry point; all helpers operate on raw
// Uint8ClampedArray so they can be unit-tested without a real canvas.

import type { ImageEffect, ImageEffectKind } from '../types'

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

/** Parse a 6-digit hex colour into [r, g, b] (0..255). */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// ---------------------------------------------------------------------------
// Per-pixel helpers (operate on flat Uint8ClampedArray, stride 4)
// ---------------------------------------------------------------------------

/** Luminance of a pixel at offset i (BT.601). */
export function luminance(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
}

/** Apply grayscale (luminance) to data in place. */
export function applyGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(luminance(data, i))
    data[i] = data[i + 1] = data[i + 2] = l
  }
}

/** Apply invert to data in place. */
export function applyInvert(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }
}

/** Apply threshold to data in place. cutoff 0..255. */
export function applyThreshold(data: Uint8ClampedArray, cutoff: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const on = luminance(data, i) >= cutoff ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = on
  }
}

/** Posterize each channel to `levels` distinct values (2..8). */
export function applyPosterize(data: Uint8ClampedArray, levels: number): void {
  const n = Math.max(2, Math.min(8, Math.round(levels)))
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(Math.round((data[i] / 255) * (n - 1)) / (n - 1) * 255)
    data[i + 1] = Math.round(Math.round((data[i + 1] / 255) * (n - 1)) / (n - 1) * 255)
    data[i + 2] = Math.round(Math.round((data[i + 2] / 255) * (n - 1)) / (n - 1) * 255)
  }
}

/**
 * Lerp between two RGB triples by t (0..1).
 * Exported so tests can use it directly.
 */
export function lerpRgb(
  dark: [number, number, number],
  light: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(dark[0] + (light[0] - dark[0]) * t),
    Math.round(dark[1] + (light[1] - dark[1]) * t),
    Math.round(dark[2] + (light[2] - dark[2]) * t),
  ]
}

/** Apply duotone: map luminance 0..1 → lerp(dark, light). */
export function applyDuotone(
  data: Uint8ClampedArray,
  darkHex: string,
  lightHex: string,
): void {
  const dark = hexToRgb(darkHex)
  const light = hexToRgb(lightHex)
  for (let i = 0; i < data.length; i += 4) {
    const t = luminance(data, i) / 255
    const [r, g, b] = lerpRgb(dark, light, t)
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
}

// 4×4 Bayer matrix (normalized 0..1)
const BAYER4: number[] = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
].map(v => v / 16)

/**
 * Apply ordered Bayer dither to data in place.
 * scale: repetition factor (1..4) — larger cells = coarser dither.
 */
export function applyDither(
  data: Uint8ClampedArray,
  width: number,
  scale: number,
  darkHex: string,
  lightHex: string,
): void {
  const dark = hexToRgb(darkHex)
  const light = hexToRgb(lightHex)
  const cell = Math.max(1, Math.min(4, Math.round(scale)))
  const height = (data.length / 4) / width
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const lum = luminance(data, i) / 255  // 0..1
      const bx = Math.floor(x / cell) % 4
      const by = Math.floor(y / cell) % 4
      const threshold = BAYER4[by * 4 + bx]
      const [r, g, b] = lum > threshold ? light : dark
      data[i] = r; data[i + 1] = g; data[i + 2] = b
    }
  }
}

// ---------------------------------------------------------------------------
// Halftone — canvas drawing (not a pixel-array helper)
// ---------------------------------------------------------------------------

/**
 * Draw a halftone screen onto an already-sized canvas.
 * The canvas must already have the source image drawn on it (we read back
 * pixel data, then clear and redraw dots).
 */
export function drawHalftone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
  angleDeg: number,
  darkHex: string,
  lightHex: string,
): void {
  // Read source luminance
  const srcData = ctx.getImageData(0, 0, width, height).data

  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  // Fill background with light colour
  ctx.fillStyle = lightHex
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = darkHex

  const halfCell = cell / 2
  const maxR = halfCell * 0.95

  // Walk a grid of centres in screen space (rotated)
  // We use a slightly oversized range to cover the rotated frame
  const diag = Math.sqrt(width * width + height * height)
  const steps = Math.ceil(diag / cell) + 2

  for (let gi = -steps; gi <= steps; gi++) {
    for (let gj = -steps; gj <= steps; gj++) {
      // Grid centre in rotated space
      const gx = gi * cell
      const gy = gj * cell
      // Rotate into screen space
      const sx = Math.round(gx * cos - gy * sin + width / 2)
      const sy = Math.round(gx * sin + gy * cos + height / 2)

      if (sx < -halfCell || sx > width + halfCell) continue
      if (sy < -halfCell || sy > height + halfCell) continue

      // Sample a small 3×3 neighbourhood from the source for average luminance
      let lum = 0
      let samples = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = Math.min(width - 1, Math.max(0, sx + dx))
          const py = Math.min(height - 1, Math.max(0, sy + dy))
          const idx = (py * width + px) * 4
          lum += (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255
          samples++
        }
      }
      lum = samples > 0 ? lum / samples : 0

      // darkness 0..1: dark image → large dot
      const darkness = 1 - lum
      const radius = maxR * Math.sqrt(darkness) // sqrt gives perceptually even growth

      if (radius < 0.5) continue
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ---------------------------------------------------------------------------
// Default params per kind
// ---------------------------------------------------------------------------

export const EFFECT_DEFAULTS: Record<ImageEffectKind, Record<string, number | string>> = {
  none:       {},
  grayscale:  {},
  invert:     {},
  threshold:  { cutoff: 128 },
  posterize:  { levels: 4 },
  duotone:    { dark: '#000000', light: '#ffffff' },
  dither:     { scale: 2, dark: '#000000', light: '#ffffff' },
  halftone:   { cell: 8, angle: 45, dark: '#000000', light: '#ffffff' },
}

// ---------------------------------------------------------------------------
// Main async entry point
// ---------------------------------------------------------------------------

/**
 * Process `srcOriginal` through the given `effect` and return a PNG dataURL.
 *
 * Returns `srcOriginal` unchanged for `kind === 'none'` or on CORS failure.
 * Never throws.
 */
export async function applyImageEffect(
  srcOriginal: string,
  effect: { kind: ImageEffectKind; params: Record<string, number | string> },
): Promise<string> {
  if (effect.kind === 'none' || !srcOriginal) return srcOriginal

  let img: HTMLImageElement
  try {
    img = await loadImageForCanvas(srcOriginal)
  } catch {
    return srcOriginal
  }

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return srcOriginal

  ctx.drawImage(img, 0, 0)

  try {
    if (effect.kind === 'halftone') {
      const cell = Number(effect.params.cell ?? 8)
      const angle = Number(effect.params.angle ?? 45)
      const dark = String(effect.params.dark ?? '#000000')
      const light = String(effect.params.light ?? '#ffffff')
      drawHalftone(ctx, canvas.width, canvas.height, cell, angle, dark, light)
    } else {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { data } = imageData

      switch (effect.kind) {
        case 'grayscale':
          applyGrayscale(data)
          break
        case 'invert':
          applyInvert(data)
          break
        case 'threshold':
          applyThreshold(data, Number(effect.params.cutoff ?? 128))
          break
        case 'posterize':
          applyPosterize(data, Number(effect.params.levels ?? 4))
          break
        case 'duotone':
          applyDuotone(
            data,
            String(effect.params.dark ?? '#000000'),
            String(effect.params.light ?? '#ffffff'),
          )
          break
        case 'dither':
          applyDither(
            data,
            canvas.width,
            Number(effect.params.scale ?? 2),
            String(effect.params.dark ?? '#000000'),
            String(effect.params.light ?? '#ffffff'),
          )
          break
      }

      ctx.putImageData(imageData, 0, 0)
    }

    return canvas.toDataURL('image/png')
  } catch {
    // Canvas tainted (CORS) or other error — return original
    return srcOriginal
  }
}

function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}
```

- [ ] **Step 2: Confirm TypeScript sees no errors**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: zero errors related to `image-effects.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/image-effects.ts
git commit -m "feat(lib): add image-effects processor with halftone/duotone/dither/posterize/threshold/invert/grayscale"
```

---

## Task 3: Unit tests for image-effects pixel helpers

**Files:**
- Create: `src/lib/image-effects.test.ts`

These tests never touch the async canvas path — they test the exported pure helpers on tiny fabricated `Uint8ClampedArray` values.

- [ ] **Step 1: Create `src/lib/image-effects.test.ts`**

```typescript
// src/lib/image-effects.test.ts
import { describe, expect, test } from 'vitest'
import {
  applyGrayscale,
  applyInvert,
  applyThreshold,
  applyPosterize,
  applyDuotone,
  applyDither,
  hexToRgb,
  lerpRgb,
  luminance,
  applyImageEffect,
  EFFECT_DEFAULTS,
} from './image-effects'

// ---------------------------------------------------------------------------
// hexToRgb
// ---------------------------------------------------------------------------
describe('hexToRgb', () => {
  test('parses white', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
  })
  test('parses black', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })
  test('parses red', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
  })
})

// ---------------------------------------------------------------------------
// luminance
// ---------------------------------------------------------------------------
describe('luminance', () => {
  test('white pixel → 255', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    expect(luminance(data, 0)).toBeCloseTo(255, 0)
  })
  test('black pixel → 0', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255])
    expect(luminance(data, 0)).toBeCloseTo(0, 0)
  })
})

// ---------------------------------------------------------------------------
// applyGrayscale
// ---------------------------------------------------------------------------
describe('applyGrayscale', () => {
  test('sets all channels to luminance', () => {
    // pure red → luminance = 0.299 * 255 ≈ 76
    const data = new Uint8ClampedArray([255, 0, 0, 255])
    applyGrayscale(data)
    // all three channels should be identical
    expect(data[0]).toBe(data[1])
    expect(data[1]).toBe(data[2])
    // alpha unchanged
    expect(data[3]).toBe(255)
  })
  test('white stays white', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    applyGrayscale(data)
    expect(data[0]).toBe(255)
  })
  test('black stays black', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255])
    applyGrayscale(data)
    expect(data[0]).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// applyInvert
// ---------------------------------------------------------------------------
describe('applyInvert', () => {
  test('inverts each channel', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255])
    applyInvert(data)
    expect(data[0]).toBe(155)
    expect(data[1]).toBe(105)
    expect(data[2]).toBe(55)
    expect(data[3]).toBe(255) // alpha unchanged
  })
  test('white → black', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    applyInvert(data)
    expect(data[0]).toBe(0)
    expect(data[1]).toBe(0)
    expect(data[2]).toBe(0)
  })
  test('double invert = original', () => {
    const original = new Uint8ClampedArray([80, 120, 200, 255])
    const data = new Uint8ClampedArray(original)
    applyInvert(data)
    applyInvert(data)
    expect(data[0]).toBe(original[0])
    expect(data[1]).toBe(original[1])
    expect(data[2]).toBe(original[2])
  })
})

// ---------------------------------------------------------------------------
// applyThreshold
// ---------------------------------------------------------------------------
describe('applyThreshold', () => {
  test('pixel above cutoff → white', () => {
    const data = new Uint8ClampedArray([200, 200, 200, 255])
    applyThreshold(data, 128)
    expect(data[0]).toBe(255)
    expect(data[1]).toBe(255)
    expect(data[2]).toBe(255)
  })
  test('pixel below cutoff → black', () => {
    const data = new Uint8ClampedArray([50, 50, 50, 255])
    applyThreshold(data, 128)
    expect(data[0]).toBe(0)
    expect(data[1]).toBe(0)
    expect(data[2]).toBe(0)
  })
  test('pixel at exactly cutoff → white (>=)', () => {
    // luminance of [128,128,128] is exactly 128
    const data = new Uint8ClampedArray([128, 128, 128, 255])
    applyThreshold(data, 128)
    expect(data[0]).toBe(255)
  })
})

// ---------------------------------------------------------------------------
// applyPosterize
// ---------------------------------------------------------------------------
describe('applyPosterize', () => {
  test('2 levels: channel is 0 or 255', () => {
    const data = new Uint8ClampedArray([80, 200, 0, 255, 128, 128, 128, 255])
    applyPosterize(data, 2)
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        expect([0, 255]).toContain(data[i + c])
      }
    }
  })
  test('4 levels: value is multiple of ~85', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255])
    applyPosterize(data, 4)
    // 255 stays 255 (top bucket)
    expect(data[0]).toBe(255)
    // 0 stays 0 (bottom bucket)
    expect(data[1]).toBe(0)
  })
  test('alpha unchanged', () => {
    const data = new Uint8ClampedArray([100, 100, 100, 200])
    applyPosterize(data, 4)
    expect(data[3]).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// lerpRgb
// ---------------------------------------------------------------------------
describe('lerpRgb', () => {
  test('t=0 returns dark', () => {
    expect(lerpRgb([0, 0, 0], [255, 255, 255], 0)).toEqual([0, 0, 0])
  })
  test('t=1 returns light', () => {
    expect(lerpRgb([0, 0, 0], [255, 255, 255], 1)).toEqual([255, 255, 255])
  })
  test('t=0.5 returns midpoint', () => {
    const [r, g, b] = lerpRgb([0, 0, 0], [200, 100, 50], 0.5)
    expect(r).toBe(100)
    expect(g).toBe(50)
    expect(b).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// applyDuotone
// ---------------------------------------------------------------------------
describe('applyDuotone', () => {
  test('white pixel maps to light colour', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    applyDuotone(data, '#000000', '#ff0000') // dark=black, light=red
    expect(data[0]).toBe(255) // r
    expect(data[1]).toBe(0)   // g
    expect(data[2]).toBe(0)   // b
  })
  test('black pixel maps to dark colour', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255])
    applyDuotone(data, '#0000ff', '#ffffff') // dark=blue
    expect(data[0]).toBe(0)
    expect(data[1]).toBe(0)
    expect(data[2]).toBe(255)
  })
  test('alpha unchanged', () => {
    const data = new Uint8ClampedArray([128, 128, 128, 77])
    applyDuotone(data, '#000000', '#ffffff')
    expect(data[3]).toBe(77)
  })
})

// ---------------------------------------------------------------------------
// applyDither — coarse check (output is dark or light colour only)
// ---------------------------------------------------------------------------
describe('applyDither', () => {
  test('every output pixel is either dark or light colour', () => {
    // 4×4 image, all medium gray
    const width = 4
    const height = 4
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128; data[i+1] = 128; data[i+2] = 128; data[i+3] = 255
    }
    applyDither(data, width, 1, '#000000', '#ffffff')
    const [darkR] = [0]
    const [lightR] = [255]
    for (let i = 0; i < data.length; i += 4) {
      expect([darkR, lightR]).toContain(data[i])
    }
  })
})

// ---------------------------------------------------------------------------
// applyImageEffect — async path (jsdom canvas is stubbed; tests the contract)
// ---------------------------------------------------------------------------
describe('applyImageEffect', () => {
  test('returns srcOriginal for kind none', async () => {
    const result = await applyImageEffect('data:image/png;base64,abc', { kind: 'none', params: {} })
    expect(result).toBe('data:image/png;base64,abc')
  })

  test('returns srcOriginal when src is empty', async () => {
    const result = await applyImageEffect('', { kind: 'grayscale', params: {} })
    expect(result).toBe('')
  })

  test('returns a string for any non-none kind (stubbed canvas → falls back gracefully)', async () => {
    // jsdom canvas getContext returns a stub; toDataURL is not wired,
    // so applyImageEffect catches and returns srcOriginal
    const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=='
    const result = await applyImageEffect(src, { kind: 'grayscale', params: {} })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// EFFECT_DEFAULTS sanity
// ---------------------------------------------------------------------------
describe('EFFECT_DEFAULTS', () => {
  test('all eight kinds have entries', () => {
    const kinds = ['none','grayscale','invert','threshold','posterize','duotone','dither','halftone']
    for (const kind of kinds) {
      expect(EFFECT_DEFAULTS).toHaveProperty(kind)
    }
  })
  test('halftone defaults have cell, angle, dark, light', () => {
    expect(EFFECT_DEFAULTS.halftone).toMatchObject({ cell: 8, angle: 45, dark: '#000000', light: '#ffffff' })
  })
})
```

- [ ] **Step 2: Run the new tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/lib/image-effects.test.ts
```

Expected: all tests pass. The async tests gracefully fall back because jsdom canvas stubs `toDataURL` as undefined (which the `try/catch` in `applyImageEffect` handles).

If `toDataURL` is not defined on the stub, the catch block returns `srcOriginal` — the "returns a string" test will still pass because `srcOriginal` is a string.

- [ ] **Step 3: Run full suite to confirm no regressions**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all 391 prior tests + new tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/image-effects.test.ts
git commit -m "test(lib): unit tests for image-effects pixel helpers"
```

---

## Task 4: Store — `setImageEffect`, `setProcessedImage`, `placeImage`

**Files:**
- Modify: `src/store/useDesign.ts`
- Modify: `src/store/useDesign.test.ts`

The key design:
- `setImageEffect(id, effect)` — writes `imageEffect` via `commit()` → **IS** a history step.
- `setProcessedImage(id, dataUrl)` — writes `content` via `set()` directly, NOT `commit()` → does **NOT** grow `past`.
- `placeImage(slotId, src)` — sets both `content` and `imageSrcOriginal` to the same src, clears any existing `imageEffect`, commits once.

The `load()` migration function should also be updated to handle old saves that don't have `imageSrcOriginal`.

- [ ] **Step 1: Write the failing tests first**

Add to `src/store/useDesign.test.ts` (at the end of the file):

```typescript
// ── Image effects ─────────────────────────────────────────────────────────────

test('placeImage sets content and imageSrcOriginal to the same src', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().placeImage(imgSlot.id, 'data:image/png;base64,abc')
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.content).toBe('data:image/png;base64,abc')
  expect(slot.imageSrcOriginal).toBe('data:image/png;base64,abc')
})

test('placeImage is an undo step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().placeImage(imgSlot.id, 'data:image/png;base64,abc')
  expect(useDesign.getState().past.length).toBe(pastBefore + 1)
})

test('setImageEffect sets imageEffect on the slot and is an undo step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'grayscale', params: {} })
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.imageEffect?.kind).toBe('grayscale')
  expect(useDesign.getState().past.length).toBe(pastBefore + 1)
})

test('setImageEffect is undoable: undo restores prior imageEffect', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'invert', params: {} })
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'grayscale', params: {} })
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.imageEffect?.kind).toBe('invert')
})

test('setProcessedImage updates content WITHOUT adding a history step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().setProcessedImage(imgSlot.id, 'data:image/png;base64,processed')
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.content).toBe('data:image/png;base64,processed')
  expect(useDesign.getState().past.length).toBe(pastBefore)
})
```

- [ ] **Step 2: Run new tests — expect failures**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/store/useDesign.test.ts 2>&1 | tail -20
```

Expected: the 5 new tests fail with "is not a function".

- [ ] **Step 3: Implement the new actions in `src/store/useDesign.ts`**

Add to the `State` interface (after `setBlend`):

```typescript
  // Image effects
  placeImage: (slotId: string, src: string) => void
  setImageEffect: (slotId: string, effect: import('../types').ImageEffect) => void
  setProcessedImage: (slotId: string, dataUrl: string) => void
```

Add the import at the top (after existing type import):
```typescript
import type { Box, Design, Format, Palette, Shadow, Slot, StyleOptions, TextStyle, Typography, ImageEffect } from '../types'
```

(Replace the existing type import line that doesn't include `ImageEffect`.)

Add the implementations inside `create<State>((set, get) => { return { ... } })`, after `setBlend`:

```typescript
    placeImage: (slotId, src) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s =>
          s.id === slotId
            ? { ...s, content: src, imageSrcOriginal: src, imageEffect: undefined }
            : s
        ),
      }
      commit(d)
    },

    setImageEffect: (slotId, effect) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s =>
          s.id === slotId ? { ...s, imageEffect: effect } : s
        ),
      }
      commit(d)
    },

    setProcessedImage: (slotId, dataUrl) => {
      // Derived state — update content directly WITHOUT going through commit().
      // This keeps the processed output out of history so undo only targets
      // the user's effect choices, not the derived pixel result.
      const design = get().design
      const nextSlots = design.slots.map(s =>
        s.id === slotId ? { ...s, content: dataUrl } : s
      )
      const next = { ...design, slots: nextSlots }
      // persist to localStorage so the result survives a refresh
      persist(next)
      set({ design: next })
    },
```

Also update the `load()` migration to handle old saves — in the `migrated` object spread, add:
```typescript
      slots: (parsed.slots ?? []).map((s, i) => ({
        ...s,
        typeClass: s.typeClass ?? (s.role !== 'image' && s.role !== 'block' && s.role !== 'line' ? classOf(s.role) : undefined),
        z: s.z ?? i,
        // Migration: imageSrcOriginal defaults to content for old image slots
        imageSrcOriginal: s.imageSrcOriginal ?? (s.role === 'image' && s.content ? s.content : undefined),
      })),
```

- [ ] **Step 4: Run the new tests — expect all pass**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/store/useDesign.test.ts
```

Expected: all tests (old + 5 new) pass.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/useDesign.ts src/store/useDesign.test.ts
git commit -m "feat(store): add placeImage, setImageEffect, setProcessedImage actions"
```

---

## Task 5: Update CropModal to use `placeImage`

**Files:**
- Modify: `src/ui/CropModal.tsx`

Currently `handleApply` calls `setContent`. Change it to call `placeImage` so that `imageSrcOriginal` is set when an image is placed via crop.

- [ ] **Step 1: Update imports in CropModal.tsx**

In `CropModal.tsx`, the store subscription lines read:
```typescript
  const setContent = useDesign(s => s.setContent)
```

Replace with:
```typescript
  const placeImage = useDesign(s => s.placeImage)
```

- [ ] **Step 2: Update `handleApply`**

Replace both calls to `setContent(cropRequest.slotId, ...)` with `placeImage(cropRequest.slotId, ...)`:

```typescript
  const handleApply = async () => {
    if (!cropRequest || applying) return
    const pixels = croppedAreaPixelsRef.current
    if (!pixels) return

    setApplying(true)
    try {
      const croppedUrl = await getCroppedDataUrl(cropRequest.src, pixels)
      placeImage(cropRequest.slotId, croppedUrl)
    } catch {
      placeImage(cropRequest.slotId, cropRequest.src)
    } finally {
      setApplying(false)
      cancelCrop()
    }
  }
```

- [ ] **Step 3: Run CropModal tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/CropModal.test.tsx
```

Expected: all existing tests pass (they test that the image is placed; they don't test the action name).

- [ ] **Step 4: Confirm full suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CropModal.tsx
git commit -m "feat(crop): use placeImage so imageSrcOriginal is set on crop apply"
```

---

## Task 6: `useImageEffectProcessor` hook

**Files:**
- Create: `src/ui/useImageEffectProcessor.ts`
- Modify: `src/ui/CanvasStage.tsx`

The hook watches image slots' `(imageSrcOriginal, imageEffect)`. On change it debounces 120ms and calls `applyImageEffect`, then calls `setProcessedImage`. If effect is absent or `none`, it short-circuits to `setProcessedImage(id, imageSrcOriginal)`.

- [ ] **Step 1: Create `src/ui/useImageEffectProcessor.ts`**

```typescript
// src/ui/useImageEffectProcessor.ts
//
// Mounted once in CanvasStage. Watches image slots for effect changes,
// debounces 120ms, runs applyImageEffect, then writes the result back
// via setProcessedImage (non-history write).
import { useEffect, useRef } from 'react'
import { useDesign } from '../store/useDesign'
import { applyImageEffect } from '../lib/image-effects'

export function useImageEffectProcessor(): void {
  const design = useDesign(s => s.design)
  const setProcessedImage = useDesign(s => s.setProcessedImage)

  // Track per-slot debounce timers
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const imageSlots = design.slots.filter(s => s.role === 'image')

    for (const slot of imageSlots) {
      const src = slot.imageSrcOriginal ?? slot.content
      if (!src) continue

      const effect = slot.imageEffect ?? { kind: 'none' as const, params: {} }

      // Build a cache key from source + effect descriptor
      const key = `${slot.id}:${src}:${effect.kind}:${JSON.stringify(effect.params)}`
      const prevKey = (slot as { _effectCacheKey?: string })._effectCacheKey

      if (key === prevKey) continue

      // Debounce
      const existing = timers.current.get(slot.id)
      if (existing) clearTimeout(existing)

      const slotId = slot.id
      const timer = setTimeout(async () => {
        timers.current.delete(slotId)
        const result = await applyImageEffect(src, effect)
        setProcessedImage(slotId, result)
      }, 120)

      timers.current.set(slot.id, timer)
    }

    // Cleanup timers on unmount
    return () => {
      for (const t of timers.current.values()) clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.slots, setProcessedImage])
}
```

Note: the `_effectCacheKey` pattern uses a slot property that doesn't exist on the type — we use a cast. An alternative simpler implementation is to just always queue the debounce and let the duplicate-result write be a no-op. Here is the simpler version (use this instead — it avoids the cast and is easier to read):

```typescript
// src/ui/useImageEffectProcessor.ts
import { useEffect, useRef } from 'react'
import { useDesign } from '../store/useDesign'
import { applyImageEffect } from '../lib/image-effects'

export function useImageEffectProcessor(): void {
  const slots = useDesign(s => s.design.slots)
  const setProcessedImage = useDesign(s => s.setProcessedImage)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const imageSlots = slots.filter(s => s.role === 'image')

    for (const slot of imageSlots) {
      const src = slot.imageSrcOriginal ?? slot.content
      if (!src) continue

      const effect = slot.imageEffect ?? { kind: 'none' as const, params: {} }
      const slotId = slot.id

      const existing = timers.current.get(slotId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        timers.current.delete(slotId)
        const result = await applyImageEffect(src, effect)
        setProcessedImage(slotId, result)
      }, 120)

      timers.current.set(slotId, timer)
    }
  }, [slots, setProcessedImage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearTimeout(t)
    }
  }, [])
}
```

Use this second version.

- [ ] **Step 2: Mount in CanvasStage**

In `src/ui/CanvasStage.tsx`, add the import near the top:
```typescript
import { useImageEffectProcessor } from './useImageEffectProcessor'
```

Inside the `CanvasStage` function body (after the `useDesign` calls, before any JSX):
```typescript
  // Run image effect processor — watches image slots and re-derives content
  useImageEffectProcessor()
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass. The hook is a side-effect that fires in the browser; jsdom tests don't render CanvasStage in these tests, so there's no impact.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useImageEffectProcessor.ts src/ui/CanvasStage.tsx
git commit -m "feat(processor): add useImageEffectProcessor hook, mount in CanvasStage"
```

---

## Task 7: EFFECTS inspector in ComposerRail — failing tests first

**Files:**
- Modify: `src/ui/ComposerRail.test.tsx`

Write the tests before touching ComposerRail.tsx.

- [ ] **Step 1: Add effect tests to `src/ui/ComposerRail.test.tsx`** (at end of file)

```typescript
// ── Image effects inspector ───────────────────────────────────────────────────

test('selecting an image slot shows the EFFECTS section', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByText(/effects/i)).toBeTruthy()
})

test('selecting an image slot shows the None chip', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByRole('button', { name: /none/i })).toBeTruthy()
})

test('selecting an image slot shows the Halftone chip', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByRole('button', { name: /halftone/i })).toBeTruthy()
})

test('clicking Halftone chip calls setImageEffect with kind halftone', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  const setImageEffect = vi.spyOn(useDesign.getState(), 'setImageEffect')
  render(<ComposerRail />)
  fireEvent.click(screen.getByRole('button', { name: /halftone/i }))
  expect(setImageEffect).toHaveBeenCalledWith(
    imgSlot.id,
    expect.objectContaining({ kind: 'halftone' })
  )
})

test('clicking Grayscale chip calls setImageEffect with kind grayscale', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  const setImageEffect = vi.spyOn(useDesign.getState(), 'setImageEffect')
  render(<ComposerRail />)
  fireEvent.click(screen.getByRole('button', { name: /b&w|grayscale/i }))
  expect(setImageEffect).toHaveBeenCalledWith(
    imgSlot.id,
    expect.objectContaining({ kind: 'grayscale' })
  )
})

test('when halftone is active, cell slider is visible', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'halftone', params: { cell: 8, angle: 45, dark: '#000000', light: '#ffffff' } })
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText(/cell/i)).toBeTruthy()
})

test('selecting a non-image slot does NOT show the EFFECTS section', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  // EFFECTS section should not be present for text
  const effectsHeadings = screen.queryAllByText(/^effects$/i)
  expect(effectsHeadings.length).toBe(0)
})
```

- [ ] **Step 2: Run new tests — expect failures**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerRail.test.tsx 2>&1 | tail -20
```

Expected: the 7 new tests fail with "unable to find element" or "not a function".

- [ ] **Step 3: Commit failing tests**

```bash
git add src/ui/ComposerRail.test.tsx
git commit -m "test(rail): add failing tests for image effects inspector"
```

---

## Task 8: Implement EFFECTS inspector section in ComposerRail

**Files:**
- Modify: `src/ui/ComposerRail.tsx`

- [ ] **Step 1: Add the `setImageEffect` subscription to the ComposerRail subscriptions block**

Find the block of `useDesign` selector lines at the top of `ComposerRail()`. Add:

```typescript
  const setImageEffect = useDesign(s => s.setImageEffect)
```

- [ ] **Step 2: Add the ImageEffectsPanel component above the main `ComposerRail` export**

Add these imports at the top of ComposerRail.tsx:
```typescript
import { EFFECT_DEFAULTS } from '../lib/image-effects'
import type { ImageEffectKind } from '../types'
```

Then add this component before `export function ComposerRail()`:

```typescript
// ── ImageEffectsPanel ──────────────────────────────────────────────────────────
const EFFECT_CHIPS: { kind: ImageEffectKind; label: string }[] = [
  { kind: 'none',       label: 'None' },
  { kind: 'halftone',   label: 'Halftone' },
  { kind: 'duotone',    label: 'Duotone' },
  { kind: 'dither',     label: 'Dither' },
  { kind: 'posterize',  label: 'Posterize' },
  { kind: 'threshold',  label: 'Threshold' },
  { kind: 'invert',     label: 'Invert' },
  { kind: 'grayscale',  label: 'B&W' },
]

function ImageEffectsPanel({
  slotId,
  effect,
  onSetEffect,
}: {
  slotId: string
  effect: import('../types').ImageEffect | undefined
  onSetEffect: (slotId: string, effect: import('../types').ImageEffect) => void
}) {
  const activeKind: ImageEffectKind = effect?.kind ?? 'none'
  const params = effect?.params ?? {}

  const chipCls = (active: boolean) => [
    'rounded border px-2 py-1 text-[11px] font-medium transition-colors duration-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
    active
      ? 'border-neutral-900 bg-neutral-900 text-white'
      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
  ].join(' ')

  const selectKind = (kind: ImageEffectKind) => {
    onSetEffect(slotId, { kind, params: { ...EFFECT_DEFAULTS[kind], ...params } })
  }

  const updateParam = (key: string, value: number | string) => {
    onSetEffect(slotId, {
      kind: activeKind,
      params: { ...params, [key]: value },
    })
  }

  return (
    <div className="space-y-2.5" data-effects-panel>
      {/* Kind chips — 4-column grid */}
      <div className="grid grid-cols-4 gap-1">
        {EFFECT_CHIPS.map(({ kind, label }) => (
          <button
            key={kind}
            aria-label={label}
            onClick={() => selectKind(kind)}
            className={chipCls(activeKind === kind)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Param controls for the active kind */}
      {activeKind === 'halftone' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor={`ef-cell-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Cell size
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-cell-${slotId}`}
                aria-label="Cell"
                type="range"
                min={4}
                max={24}
                step={1}
                value={Number(params.cell ?? 8)}
                onChange={e => updateParam('cell', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.cell ?? 8)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`ef-angle-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Angle
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-angle-${slotId}`}
                aria-label="Angle"
                type="range"
                min={0}
                max={90}
                step={1}
                value={Number(params.angle ?? 45)}
                onChange={e => updateParam('angle', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.angle ?? 45)}°
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-dark-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Dark
              </label>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-light-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Light
              </label>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'duotone' && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor={`ef-dark-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Dark
            </label>
            <input
              id={`ef-dark-${slotId}`}
              type="color"
              aria-label="Dark colour"
              value={String(params.dark ?? '#000000')}
              onChange={e => updateParam('dark', e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor={`ef-light-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Light
            </label>
            <input
              id={`ef-light-${slotId}`}
              type="color"
              aria-label="Light colour"
              value={String(params.light ?? '#ffffff')}
              onChange={e => updateParam('light', e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
            />
          </div>
        </div>
      )}

      {activeKind === 'dither' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor={`ef-scale-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Scale
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-scale-${slotId}`}
                aria-label="Scale"
                type="range"
                min={1}
                max={4}
                step={1}
                value={Number(params.scale ?? 2)}
                onChange={e => updateParam('scale', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-4 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.scale ?? 2)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-dark-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Dark
              </label>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-light-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Light
              </label>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'posterize' && (
        <div className="space-y-1">
          <label
            htmlFor={`ef-levels-${slotId}`}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            Levels
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`ef-levels-${slotId}`}
              aria-label="Levels"
              type="range"
              min={2}
              max={8}
              step={1}
              value={Number(params.levels ?? 4)}
              onChange={e => updateParam('levels', Number(e.target.value))}
              className="flex-1 accent-neutral-900"
            />
            <span className="w-4 text-right text-[10px] tabular-nums text-neutral-500">
              {Number(params.levels ?? 4)}
            </span>
          </div>
        </div>
      )}

      {activeKind === 'threshold' && (
        <div className="space-y-1">
          <label
            htmlFor={`ef-cutoff-${slotId}`}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            Cutoff
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`ef-cutoff-${slotId}`}
              aria-label="Cutoff"
              type="range"
              min={0}
              max={255}
              step={1}
              value={Number(params.cutoff ?? 128)}
              onChange={e => updateParam('cutoff', Number(e.target.value))}
              className="flex-1 accent-neutral-900"
            />
            <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
              {Number(params.cutoff ?? 128)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Insert the EFFECTS section into the IMAGE controls block in `ComposerRail`**

Find the `{/* IMAGE controls */}` comment block (around line 699 in ComposerRail.tsx). After the B&W checkbox `InspectorRow` closing `</InspectorRow>`, add before the closing `</div>` of `{isImage && (`:

```tsx
                  {/* EFFECTS */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      Effects
                    </div>
                    <ImageEffectsPanel
                      slotId={selectedSlot.id}
                      effect={selectedSlot.imageEffect}
                      onSetEffect={setImageEffect}
                    />
                  </div>
```

- [ ] **Step 4: Run the ComposerRail tests**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run src/ui/ComposerRail.test.tsx
```

Expected: all tests including the 7 new ones pass.

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 6: Run full suite**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/ui/ComposerRail.tsx
git commit -m "feat(rail): add EFFECTS section with kind chips and param controls for image slots"
```

---

## Task 9: Build verification

**Files:** No code changes — just confirm `pnpm build` is clean.

- [ ] **Step 1: Run full test suite one final time**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm vitest run
```

Expected: all tests pass (391 + new ones).

- [ ] **Step 2: Run build**

```bash
cd /Users/mymac/Documents/Work/raster && pnpm build 2>&1 | tail -30
```

Expected: clean build with no TypeScript errors or warnings that indicate real issues.

- [ ] **Step 3: Report BASE_SHA and all commit SHAs**

```bash
git log --oneline -10
```

Expected output: a list showing `cd9c4bd` (BASE_SHA) and all commits added in this feature.

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|------------------|------|
| `imageSrcOriginal` and `imageEffect` fields on Slot | Task 1 |
| `applyImageEffect` async processor + all 8 kinds | Task 2 |
| CORS fallback in processor | Task 2 (catch block returns srcOriginal) |
| Pure pixel helpers unit-testable | Task 3 |
| `setImageEffect` is a history step | Task 4 |
| `setProcessedImage` does NOT add history | Task 4 |
| `placeImage` sets both content and imageSrcOriginal | Task 4 |
| CropModal calls placeImage | Task 5 |
| `useImageEffectProcessor` hook debounced 120ms | Task 6 |
| Hook mounted in CanvasStage | Task 6 |
| EFFECTS section in ComposerRail (8 chips) | Task 8 |
| Halftone has cell, angle, dark, light params | Task 8 |
| Duotone has dark, light params | Task 8 |
| Dither has scale, dark, light params | Task 8 |
| Posterize has levels param | Task 8 |
| Threshold has cutoff param | Task 8 |
| Export unaffected (content is dataURL, existing path) | Inherent in design |
| `bw` render filter still applies on top | Unchanged in Renderer.tsx |
| All tests pass + build clean | Task 9 |

**Type consistency check:**
- `ImageEffect` defined in `types.ts` (Task 1) → imported in `image-effects.ts`, `useDesign.ts`, `ComposerRail.tsx`.
- `ImageEffectKind` exported from `types.ts` → used in `EFFECT_DEFAULTS`, `EFFECT_CHIPS`, `ImageEffectsPanel`.
- `placeImage(slotId: string, src: string)` — consistent across `useDesign.ts` State interface, implementation, and `CropModal.tsx` call.
- `setImageEffect(slotId: string, effect: ImageEffect)` — consistent across State interface, implementation, and ComposerRail spy call.
- `setProcessedImage(slotId: string, dataUrl: string)` — consistent across interface, implementation, and processor hook.

**Placeholder scan:** No TBD, TODO, or "similar to" references found.

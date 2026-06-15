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

/** Apply duotone: map luminance 0..1 -> lerp(dark, light). */
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

// 4x4 Bayer matrix (normalized 0..1)
const BAYER4: number[] = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
].map(v => v / 16)

/**
 * Apply ordered Bayer dither to data in place.
 * scale: repetition factor (1..4) -- larger cells = coarser dither.
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
// Halftone -- canvas drawing (not a pixel-array helper)
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

      // Sample a small 3x3 neighbourhood from the source for average luminance
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

      // darkness 0..1: dark image -> large dot
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
// Colour halftone -- CMYK / RGB channel separation, canvas drawing
// ---------------------------------------------------------------------------

export type ColorHalftoneMode = 'cmyk' | 'rgb'

// CMYK separation from normalised rgb (0..1). Returns ink amount 0..1.
function cmykK(r: number, g: number, b: number): number {
  return 1 - Math.max(r, g, b)
}
function cmykInk(channel: number, r: number, g: number, b: number): number {
  const k = cmykK(r, g, b)
  if (k >= 1) return 0
  return (1 - channel - k) / (1 - k)
}

interface ChannelSpec {
  /** angle offset added to the master angle, in degrees */
  off: number
  /** dot ink colour */
  color: string
  /** ink amount 0..1 from normalised rgb */
  amount: (r: number, g: number, b: number) => number
}

/**
 * Draw a colour halftone screen onto an already-sized canvas that already has
 * the source image drawn on it. Each colour channel is rendered as its own
 * rotated dot screen, then the screens are overprinted:
 *   - CMYK: Cyan/Magenta/Yellow/Black inks composited with `multiply` onto the
 *     paper colour (subtractive, print look).
 *   - RGB: Red/Green/Blue dots composited with `lighter` onto the background
 *     (additive, screen look).
 */
export function drawColorHalftone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: ColorHalftoneMode,
  cell: number,
  angleDeg: number,
  bgHex: string,
): void {
  const srcData = ctx.getImageData(0, 0, width, height).data

  // Paper / background (drawn with default source-over before we switch ops).
  ctx.fillStyle = bgHex
  ctx.fillRect(0, 0, width, height)

  const channels: ChannelSpec[] =
    mode === 'rgb'
      ? [
          { off: 15, color: '#ff0000', amount: r => r },
          { off: 75, color: '#00ff00', amount: (_r, g) => g },
          { off: 0, color: '#0000ff', amount: (_r, _g, b) => b },
        ]
      : [
          // Classic process screen angles (relative to master): C=15, M=75, Y=0, K=45.
          { off: 15, color: '#00ffff', amount: (r, g, b) => cmykInk(r, r, g, b) },
          { off: 75, color: '#ff00ff', amount: (r, g, b) => cmykInk(g, r, g, b) },
          { off: 0, color: '#ffff00', amount: (r, g, b) => cmykInk(b, r, g, b) },
          { off: 45, color: '#000000', amount: (r, g, b) => cmykK(r, g, b) },
        ]

  ctx.globalCompositeOperation = mode === 'rgb' ? 'lighter' : 'multiply'

  const halfCell = cell / 2
  const maxR = halfCell * 0.95
  const diag = Math.sqrt(width * width + height * height)
  const steps = Math.ceil(diag / cell) + 2

  for (const ch of channels) {
    ctx.fillStyle = ch.color
    const angleRad = ((angleDeg + ch.off) * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    for (let gi = -steps; gi <= steps; gi++) {
      for (let gj = -steps; gj <= steps; gj++) {
        const gx = gi * cell
        const gy = gj * cell
        const sx = Math.round(gx * cos - gy * sin + width / 2)
        const sy = Math.round(gx * sin + gy * cos + height / 2)

        if (sx < -halfCell || sx > width + halfCell) continue
        if (sy < -halfCell || sy > height + halfCell) continue

        // Average rgb over a 3x3 neighbourhood.
        let r = 0, g = 0, b = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const px = Math.min(width - 1, Math.max(0, sx + dx))
            const py = Math.min(height - 1, Math.max(0, sy + dy))
            const idx = (py * width + px) * 4
            r += srcData[idx]; g += srcData[idx + 1]; b += srcData[idx + 2]; n++
          }
        }
        if (n === 0) continue

        const amt = ch.amount(r / n / 255, g / n / 255, b / n / 255)
        const radius = maxR * Math.sqrt(Math.max(0, Math.min(1, amt)))

        if (radius < 0.5) continue
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.globalCompositeOperation = 'source-over'
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
  'color-halftone': { mode: 'cmyk', cell: 8, angle: 0, bg: '#f2ecd9' },
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
    } else if (effect.kind === 'color-halftone') {
      const mode: ColorHalftoneMode =
        String(effect.params.mode ?? 'cmyk') === 'rgb' ? 'rgb' : 'cmyk'
      const cell = Number(effect.params.cell ?? 8)
      const angle = Number(effect.params.angle ?? 0)
      const bg = String(effect.params.bg ?? '#f2ecd9')
      drawColorHalftone(ctx, canvas.width, canvas.height, mode, cell, angle, bg)
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
    // Canvas tainted (CORS) or other error -- return original
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

// Re-export ImageEffect type for convenience
export type { ImageEffect }

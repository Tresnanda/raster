import { expect, test } from 'vitest'
import { contrastRatio } from './grid-coach'
import { extractPalette } from './palette-extract'

function pixelsFromBuckets(buckets: Array<{ rgb: [number, number, number]; count: number }>): Uint8ClampedArray {
  const values: number[] = []
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i++) {
      values.push(bucket.rgb[0], bucket.rgb[1], bucket.rgb[2], 255)
    }
  }
  return new Uint8ClampedArray(values)
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function saturation(hex: string): number {
  const [r, g, b] = rgb(hex).map(value => value / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

test('extractPalette assigns readable Swiss bg, text, and accent roles', () => {
  const pixels = pixelsFromBuckets([
    { rgb: [238, 236, 229], count: 80 },
    { rgb: [220, 42, 34], count: 28 },
    { rgb: [17, 18, 20], count: 12 },
  ])

  const palette = extractPalette(pixels, 10, 12)

  expect(palette.bg).toMatch(/^#[0-9a-f]{6}$/)
  expect(palette.text).toMatch(/^#[0-9a-f]{6}$/)
  expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/)
  expect(contrastRatio(palette.bg, palette.text)).toBeGreaterThanOrEqual(4.5)
  expect(saturation(palette.accent)).toBeGreaterThan(0.45)
  expect(palette.accent).not.toBe(palette.bg)
  expect(palette.accent).not.toBe(palette.text)
})

test('extractPalette handles a flat single-colour image gracefully', () => {
  const pixels = pixelsFromBuckets([
    { rgb: [34, 36, 39], count: 64 },
  ])

  const palette = extractPalette(pixels, 8, 8)

  expect(contrastRatio(palette.bg, palette.text)).toBeGreaterThanOrEqual(4.5)
  expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/)
})

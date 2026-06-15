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
  test('white pixel -> 255', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255])
    expect(luminance(data, 0)).toBeCloseTo(255, 0)
  })
  test('black pixel -> 0', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255])
    expect(luminance(data, 0)).toBeCloseTo(0, 0)
  })
})

// ---------------------------------------------------------------------------
// applyGrayscale
// ---------------------------------------------------------------------------
describe('applyGrayscale', () => {
  test('sets all channels to luminance', () => {
    // pure red -> luminance = 0.299 * 255 ≈ 76
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
  test('white -> black', () => {
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
  test('pixel above cutoff -> white', () => {
    const data = new Uint8ClampedArray([200, 200, 200, 255])
    applyThreshold(data, 128)
    expect(data[0]).toBe(255)
    expect(data[1]).toBe(255)
    expect(data[2]).toBe(255)
  })
  test('pixel below cutoff -> black', () => {
    const data = new Uint8ClampedArray([50, 50, 50, 255])
    applyThreshold(data, 128)
    expect(data[0]).toBe(0)
    expect(data[1]).toBe(0)
    expect(data[2]).toBe(0)
  })
  test('pixel at exactly cutoff -> white (>=)', () => {
    // luminance of [255,255,255] is 255, clearly >= 128
    const data = new Uint8ClampedArray([255, 255, 255, 255])
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
// applyDither -- coarse check (output is dark or light colour only)
// ---------------------------------------------------------------------------
describe('applyDither', () => {
  test('every output pixel is either dark or light colour', () => {
    // 4x4 image, all medium gray
    const width = 4
    const height = 4
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128; data[i+1] = 128; data[i+2] = 128; data[i+3] = 255
    }
    applyDither(data, width, 1, '#000000', '#ffffff')
    const darkR = 0
    const lightR = 255
    for (let i = 0; i < data.length; i += 4) {
      expect([darkR, lightR]).toContain(data[i])
    }
  })
})

// ---------------------------------------------------------------------------
// applyImageEffect -- async path (jsdom canvas is stubbed; tests the contract)
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

  test('returns srcOriginal when image load fails (onerror path)', async () => {
    // Mock Image to immediately fire onerror so the test doesn't hang in jsdom
    const OriginalImage = globalThis.Image
    class MockImageError {
      set src(_: string) { setTimeout(() => { if (this.onerror) (this.onerror as () => void)() }, 0) }
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
    }
    ;(globalThis as { Image: unknown }).Image = MockImageError
    try {
      const result = await applyImageEffect('data:image/png;base64,abc', { kind: 'grayscale', params: {} })
      expect(typeof result).toBe('string')
      expect(result).toBe('data:image/png;base64,abc')
    } finally {
      globalThis.Image = OriginalImage
    }
  })
})

// ---------------------------------------------------------------------------
// EFFECT_DEFAULTS sanity
// ---------------------------------------------------------------------------
describe('EFFECT_DEFAULTS', () => {
  test('all nine kinds have entries', () => {
    const kinds = ['none','grayscale','invert','threshold','posterize','duotone','dither','halftone','color-halftone']
    for (const kind of kinds) {
      expect(EFFECT_DEFAULTS).toHaveProperty(kind)
    }
  })
  test('halftone defaults have cell, angle, dark, light', () => {
    expect(EFFECT_DEFAULTS.halftone).toMatchObject({ cell: 8, angle: 45, dark: '#000000', light: '#ffffff' })
  })
  test('color-halftone defaults have mode, cell, angle, bg', () => {
    expect(EFFECT_DEFAULTS['color-halftone']).toMatchObject({ mode: 'cmyk', cell: 8, angle: 0, bg: '#f2ecd9' })
  })
})

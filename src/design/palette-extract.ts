import type { Palette } from '../types'
import { contrastRatio } from './grid-coach'

interface ColorBucket {
  r: number
  g: number
  b: number
  count: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
}

function hex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function channel(value: number): number {
  const x = value / 255
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function luminance(color: ColorBucket): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

function saturation(color: ColorBucket): number {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

function distance(a: ColorBucket, b: ColorBucket): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function weightedAverage(colors: ColorBucket[]): ColorBucket {
  const total = Math.max(1, colors.reduce((sum, color) => sum + color.count, 0))
  return {
    r: colors.reduce((sum, color) => sum + color.r * color.count, 0) / total,
    g: colors.reduce((sum, color) => sum + color.g * color.count, 0) / total,
    b: colors.reduce((sum, color) => sum + color.b * color.count, 0) / total,
    count: total,
  }
}

function collectColors(pixels: Uint8ClampedArray): ColorBucket[] {
  const buckets = new Map<string, ColorBucket>()
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3]
    if (alpha < 64) continue
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const key = `${r >> 3},${g >> 3},${b >> 3}`
    const prev = buckets.get(key)
    if (prev) {
      prev.r += r
      prev.g += g
      prev.b += b
      prev.count += 1
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  return [...buckets.values()].map(color => ({
    r: color.r / color.count,
    g: color.g / color.count,
    b: color.b / color.count,
    count: color.count,
  }))
}

function colorRange(colors: ColorBucket[], channelName: 'r' | 'g' | 'b'): number {
  const values = colors.map(color => color[channelName])
  return Math.max(...values) - Math.min(...values)
}

function splitBucket(colors: ColorBucket[]): [ColorBucket[], ColorBucket[]] {
  const ranges = [
    { channel: 'r' as const, range: colorRange(colors, 'r') },
    { channel: 'g' as const, range: colorRange(colors, 'g') },
    { channel: 'b' as const, range: colorRange(colors, 'b') },
  ].sort((a, b) => b.range - a.range)
  const channelName = ranges[0].channel
  const sorted = [...colors].sort((a, b) => a[channelName] - b[channelName])
  const half = sorted.reduce((sum, color) => sum + color.count, 0) / 2
  let running = 0
  let splitAt = 1
  for (let i = 0; i < sorted.length; i++) {
    running += sorted[i].count
    if (running >= half) {
      splitAt = clamp(i + 1, 1, sorted.length - 1)
      break
    }
  }
  return [sorted.slice(0, splitAt), sorted.slice(splitAt)]
}

function quantize(colors: ColorBucket[], maxBuckets = 8): ColorBucket[] {
  if (colors.length === 0) return [{ r: 245, g: 243, b: 238, count: 1 }]
  const buckets: ColorBucket[][] = [colors]

  while (buckets.length < maxBuckets) {
    const splitIndex = buckets
      .map((bucket, index) => ({
        index,
        score: bucket.length * Math.max(colorRange(bucket, 'r'), colorRange(bucket, 'g'), colorRange(bucket, 'b')),
      }))
      .sort((a, b) => b.score - a.score)[0]?.index
    if (splitIndex === undefined || buckets[splitIndex].length < 2) break
    const [left, right] = splitBucket(buckets[splitIndex])
    buckets.splice(splitIndex, 1, left, right)
  }

  return buckets.map(weightedAverage).sort((a, b) => b.count - a.count)
}

function colorToHex(color: ColorBucket): string {
  return hex(color.r, color.g, color.b)
}

function fallbackAccent(bg: ColorBucket): string {
  return luminance(bg) < 0.45 ? '#ff3b30' : '#d6231f'
}

export function extractPalette(pixels: Uint8ClampedArray, width: number, height: number): Palette {
  const expected = Math.max(0, width * height * 4)
  const usablePixels = expected > 0 && pixels.length >= expected ? pixels.slice(0, expected) : pixels
  const colors = quantize(collectColors(usablePixels), 8)

  const bg = [...colors].sort((a, b) => {
    const aSat = saturation(a)
    const bSat = saturation(b)
    const aExtreme = Math.abs(luminance(a) - 0.5) * 2
    const bExtreme = Math.abs(luminance(b) - 0.5) * 2
    const aScore = a.count * ((1 - aSat) * 0.9 + aExtreme * 0.6)
    const bScore = b.count * ((1 - bSat) * 0.9 + bExtreme * 0.6)
    return bScore - aScore
  })[0]

  const bgHex = colorToHex(bg)
  const darkText = '#0a0a0a'
  const lightText = '#ffffff'
  const text = contrastRatio(bgHex, darkText) >= contrastRatio(bgHex, lightText) ? darkText : lightText
  const textProxy: ColorBucket = text === darkText
    ? { r: 10, g: 10, b: 10, count: 1 }
    : { r: 255, g: 255, b: 255, count: 1 }

  const accent = [...colors]
    .filter(color => distance(color, bg) > 48 && distance(color, textProxy) > 64)
    .sort((a, b) => (saturation(b) * b.count) - (saturation(a) * a.count))[0]

  return {
    bg: bgHex,
    text,
    accent: accent ? colorToHex(accent) : fallbackAccent(bg),
  }
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not read image'))
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function paletteFromImageFile(file: File): Promise<Palette> {
  const image = await readImage(file)
  const maxSide = 64
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(image, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height)
  return extractPalette(data.data, width, height)
}

import type { Canvas, Format, Grid } from '../types'

export const FORMATS: Record<Format, Canvas> = {
  '4:5': { w: 1080, h: 1350 },
  '2:3': { w: 1080, h: 1620 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '16:9': { w: 1920, h: 1080 },
  '3:4': { w: 1080, h: 1440 },
  'A4': { w: 1080, h: 1527 },
}

export function canvasFor(f: Format): Canvas { return FORMATS[f] }

export function defaultGrid(): Grid {
  return { cols: 12, rows: 16, margin: 64, gutter: 24 }
}

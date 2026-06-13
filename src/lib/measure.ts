import type { FontFamily } from '../types'

const STACK: Record<FontFamily, string> = {
  sans: "'Inter', sans-serif",
  display: "'Archivo', sans-serif",
  mono: "'Space Mono', monospace",
  condensed: "'Archivo Narrow', sans-serif",
}

export type Measure = (text: string, size: number, family: FontFamily, weight: number) => number

/** Build a measurer backed by a 2D canvas context. */
export function makeMeasurer(getCtx: () => CanvasRenderingContext2D): Measure {
  return (text, size, family, weight) => {
    const ctx = getCtx()
    ctx.font = `${weight} ${size}px ${STACK[family]}`
    return ctx.measureText(text).width
  }
}

export function defaultMeasurer(): Measure {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  return makeMeasurer(() => ctx)
}

export { STACK as FONT_STACK }

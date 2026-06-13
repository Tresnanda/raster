import type { Canvas } from '../types'

export function rasterSize(canvas: Canvas, scale: number): Canvas {
  return { w: Math.round(canvas.w * scale), h: Math.round(canvas.h * scale) }
}

/** Rasterize an SVG string to a PNG/JPG blob at the given pixel size. */
export async function rasterizeSvg(
  svgString: string, size: Canvas, type: 'image/png' | 'image/jpeg', quality = 0.92,
): Promise<Blob> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url })
    const canvasEl = document.createElement('canvas')
    canvasEl.width = size.w; canvasEl.height = size.h
    const ctx = canvasEl.getContext('2d')!
    if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.w, size.h) }
    ctx.drawImage(img, 0, 0, size.w, size.h)
    return await new Promise<Blob>((res, rej) =>
      canvasEl.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), type, quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}

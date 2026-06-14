import { canvasFor } from '../design/formats'
import type { Design } from '../types'
import type { MotionEffect, MotionSequence } from '../design/motion'
import { motionSequenceDurationMs, normalizeMotionSequence, playPosterMotion } from '../design/motion'
import { buildEmbeddedFontCss, serializeSvg, downloadBlob } from './to-svg'
import { EXPORT_FACES } from './useExport'

export interface VideoOpts {
  fps?: number
  /** ms the motion plays for before holding on the final frame. */
  motionMs?: number
  /** ms to hold the finished poster at the end. */
  holdMs?: number
  /** resolution scale (1 = native canvas px; 0.5 = half for speed). */
  scale?: number
  sequence?: Partial<MotionSequence>
}

export function isVideoExportSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

function pickMime(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c
  }
  return 'video/webm'
}

/**
 * Record the poster's kinetic text motion to a WebM clip.
 *
 * Approach: the motion lives on the live SVG (GSAP sets inline transforms on the
 * `[data-slot]` groups). We build the timeline PAUSED, then in a real-time loop we
 * scrub it (`tl.time(t)`), serialize the live SVG (with fonts embedded), rasterize
 * that frame onto a canvas, and let `MediaRecorder` capture the canvas stream.
 * Driving the timeline by real elapsed time keeps the clip at the right speed even
 * if rasterizing drops the effective frame rate.
 */
export async function exportVideo(
  svg: SVGSVGElement | null,
  design: Design,
  effect: MotionEffect,
  opts: VideoOpts = {},
): Promise<void> {
  if (!svg || !isVideoExportSupported()) return

  const sequence = normalizeMotionSequence({ ...opts.sequence, effect })
  const fps = opts.fps ?? 30
  const motionMs = opts.motionMs ?? motionSequenceDurationMs(sequence, design.slots.length)
  const holdMs = opts.holdMs ?? 1200
  const scale = opts.scale ?? 1
  const c = canvasFor(design.format)
  const W = Math.round(c.w * scale)
  const H = Math.round(c.h * scale)

  const fontCss = await buildEmbeddedFontCss(EXPORT_FACES)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const stream = canvas.captureStream(fps)
  const mime = pickMime()
  const chunks: Blob[] = []
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const finished = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })) })

  // Build the motion paused so we can scrub it frame-accurately.
  const tl = playPosterMotion(svg, effect, { paused: true, sequence })
  const motionDur = tl ? tl.duration() : 0 // seconds

  const drawFrame = async (timelineSec: number) => {
    if (tl) tl.time(timelineSec)
    const str = serializeSvg(svg, fontCss)
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' })
    const bmp = await createImageBitmap(blob)
    ctx.fillStyle = design.palette.bg
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(bmp, 0, 0, W, H)
    bmp.close?.()
  }

  rec.start()
  const startedAt = performance.now()
  const totalMs = motionMs + holdMs
  // Real-time loop: map elapsed → timeline time; hold at the end.
  for (;;) {
    const elapsed = performance.now() - startedAt
    if (elapsed >= totalMs) break
    const timelineSec = Math.min(motionDur, (elapsed / motionMs) * motionDur)
    await drawFrame(timelineSec)
  }
  // Ensure a final settled frame is on the canvas.
  await drawFrame(motionDur)
  rec.stop()

  const out = await finished
  if (tl) { tl.progress(1); tl.kill() } // leave the live poster in its final state
  downloadBlob(out, `raster-${design.layout}.webm`)
}

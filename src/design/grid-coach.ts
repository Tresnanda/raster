import type { Design, Slot, TextStyle, Typography } from '../types'
import { canvasFor } from './formats'
import { slotBox } from '../lib/grid'
import { classOf } from './typeclass'

export type CoachFindingKind = 'contrast' | 'alignment' | 'hierarchy' | 'spacing' | 'occlusion' | 'bounds'
export type CoachFindingSeverity = 'good' | 'info' | 'warning' | 'danger'
export type CoachFixId = 'increase-contrast' | 'left-align-type' | 'tighten-hierarchy' | 'reduce-density'

export interface CoachFinding {
  kind: CoachFindingKind
  severity: CoachFindingSeverity
  message: string
  fixId?: CoachFixId
}

export interface GridCoachReport {
  score: number
  findings: CoachFinding[]
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function channel(value: number): number {
  const x = value / 255
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

function occupiedFraction(design: Design): number {
  const canvas = canvasFor(design.format)
  const area = canvas.w * canvas.h
  const occupied = design.slots.reduce((sum, slot) => {
    if (slot.hidden) return sum
    const box = slotBox(canvas, design.grid, slot)
    return sum + box.w * box.h
  }, 0)
  return occupied / area
}

function boxesOverlap(a: ReturnType<typeof slotBox>, b: ReturnType<typeof slotBox>): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function resolvedTextStyle(slot: Slot, typography: Typography): TextStyle {
  const base = slot.text!
  const cls = slot.typeClass ?? classOf(slot.role)
  const overrides = slot.overridden ?? []
  const pick = <K extends keyof TextStyle>(field: K, globalValue: TextStyle[K]): TextStyle[K] =>
    overrides.includes(field) ? base[field] : globalValue

  if (cls === 'title' || cls === 'headline') {
    return {
      ...base,
      size: pick('size', typography[cls] as number),
      family: pick('family', typography.typeface),
      tracking: pick('tracking', typography.tracking),
      leading: pick('leading', typography.leading),
    }
  }

  return {
    ...base,
    size: pick('size', typography.body),
  }
}

function isTitleLike(slot: Slot): boolean {
  return (slot.typeClass ?? '') === 'title' || slot.role === 'headline'
}

function textWidthFactor(style: TextStyle): number {
  const base = style.family === 'mono'
    ? 0.62
    : style.family === 'condensed'
      ? 0.48
      : style.family === 'display'
        ? 0.6
        : 0.56
  return Math.max(0.42, base + style.tracking)
}

function estimatedTextBounds(design: Design, slot: Slot): ReturnType<typeof slotBox> {
  const canvas = canvasFor(design.format)
  const box = slotBox(canvas, design.grid, slot)
  const style = resolvedTextStyle(slot, design.typography)
  if (style.fit === 'auto') return box
  const lines = slot.content.split('\n').filter(Boolean)
  const fallbackLines = lines.length ? lines : ['']
  const factor = textWidthFactor(style)
  const lineWidths = fallbackLines.map(line => Math.max(style.size * 0.6, line.length * style.size * factor))
  const lineAdvance = style.size * style.leading
  const height = fallbackLines.length * lineAdvance
  const y = box.y + (box.h - height) / 2

  const xValues = lineWidths.flatMap(lineWidth => {
    if (style.align === 'center') {
      const center = box.x + box.w / 2
      return [center - lineWidth / 2, center + lineWidth / 2]
    }
    if (style.align === 'right') {
      return [box.x + box.w - lineWidth, box.x + box.w]
    }
    return [box.x, box.x + lineWidth]
  })

  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  return { x: minX, y, w: maxX - minX, h: height }
}

function clippedAmount(box: ReturnType<typeof slotBox>, canvas: { w: number; h: number }): number {
  return Math.max(
    0,
    -box.x,
    -box.y,
    box.x + box.w - canvas.w,
    box.y + box.h - canvas.h,
  )
}

function textImageOverlapCount(design: Design): number {
  const canvas = canvasFor(design.format)
  const texts = design.slots.filter(slot => slot.text && !slot.hidden)
  const images = design.slots.filter(slot => slot.role === 'image' && !slot.hidden)
  let count = 0
  for (const text of texts) {
    const textBox = slotBox(canvas, design.grid, text)
    for (const image of images) {
      const imageBox = slotBox(canvas, design.grid, image)
      const fullBleed = imageBox.x <= 0 && imageBox.y <= 0 && imageBox.w >= canvas.w && imageBox.h >= canvas.h
      if (!fullBleed && boxesOverlap(textBox, imageBox)) count += 1
    }
  }
  return count
}

function clippedReadableTextSlots(design: Design): Slot[] {
  const canvas = canvasFor(design.format)
  return design.slots.filter(slot => {
    if (!slot.text || slot.hidden || slot.role === 'glyph') return false
    const box = slotBox(canvas, design.grid, slot)
    const visibleText = estimatedTextBounds(design, slot)
    return clippedAmount(box, canvas) > 4 || clippedAmount(visibleText, canvas) > 12
  })
}

function hierarchyRatio(design: Design, textSlots: Slot[]): number {
  const sizes = textSlots
    .map(slot => resolvedTextStyle(slot, design.typography).size)
    .sort((a, b) => b - a)
  if (sizes.length < 2) return 3
  return sizes[0] / Math.max(1, sizes[1])
}

function withOverridden(slot: Slot, fields: (keyof TextStyle)[]): Slot {
  const overridden = [...new Set([...(slot.overridden ?? []), ...fields])]
  return { ...slot, overridden }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.max(min, Math.min(max, value))
}

export function buildGridCoachReport(design: Design): GridCoachReport {
  let score = 100
  const findings: CoachFinding[] = []
  const ratio = contrastRatio(design.palette.bg, design.palette.text)
  const textSlots = design.slots.filter(slot => slot.text && !slot.hidden)
  const bodyCentered = textSlots.filter(slot => (slot.typeClass ?? 'body') !== 'title' && slot.text?.align === 'center')
  const titleSlots = textSlots.filter(isTitleLike)
  const density = occupiedFraction(design)
  const overlaps = textImageOverlapCount(design)
  const clippedText = clippedReadableTextSlots(design)
  const clippedTitles = clippedText.filter(isTitleLike)
  const dominantRatio = hierarchyRatio(design, textSlots)

  if (ratio < 4.5) {
    score -= 28
    findings.push({
      kind: 'contrast',
      severity: 'danger',
      message: 'Text contrast is below a comfortable reading threshold.',
      fixId: 'increase-contrast',
    })
  } else {
    findings.push({
      kind: 'contrast',
      severity: 'good',
      message: 'Text/background contrast is readable.',
    })
  }

  if (bodyCentered.length > 0) {
    score -= Math.min(18, bodyCentered.length * 6)
    findings.push({
      kind: 'alignment',
      severity: 'warning',
      message: 'Supporting copy is centered; Swiss layouts usually scan faster flush-left.',
      fixId: 'left-align-type',
    })
  } else {
    findings.push({
      kind: 'alignment',
      severity: 'good',
      message: 'Supporting copy follows a stable reading edge.',
    })
  }

  if (titleSlots.length === 0) {
    score -= 16
    findings.push({
      kind: 'hierarchy',
      severity: 'warning',
      message: 'No dominant title layer is obvious.',
      fixId: 'tighten-hierarchy',
    })
  } else if (dominantRatio < 1.45) {
    score -= 10
    findings.push({
      kind: 'hierarchy',
      severity: 'warning',
      message: 'The title is too close in scale to supporting copy.',
      fixId: 'tighten-hierarchy',
    })
  } else {
    findings.push({
      kind: 'hierarchy',
      severity: 'info',
      message: 'A dominant title layer anchors the composition.',
    })
  }

  if (clippedTitles.length > 0) {
    score -= Math.min(30, clippedTitles.length * 24)
    findings.push({
      kind: 'bounds',
      severity: 'danger',
      message: 'Title text is clipped by the canvas edge.',
      fixId: 'tighten-hierarchy',
    })
  } else if (clippedText.length > 0) {
    score -= Math.min(18, clippedText.length * 9)
    findings.push({
      kind: 'bounds',
      severity: 'warning',
      message: 'A text layer is clipped by the canvas edge.',
      fixId: 'tighten-hierarchy',
    })
  }

  if (density > 0.78) {
    score -= 12
    findings.push({
      kind: 'spacing',
      severity: 'warning',
      message: 'The poster is visually dense; more whitespace would improve scanning.',
      fixId: 'reduce-density',
    })
  }

  if (overlaps > 0) {
    score -= Math.min(18, overlaps * 6)
    findings.push({
      kind: 'occlusion',
      severity: 'warning',
      message: 'Text overlaps image regions outside a full-bleed background.',
      fixId: 'reduce-density',
    })
  }

  return { score: clampScore(score), findings }
}

export function applyCoachFix(design: Design, fixId: CoachFixId): Design {
  if (fixId === 'increase-contrast') {
    const darkBg = luminance(design.palette.bg) < 0.5
    return {
      ...design,
      palette: {
        ...design.palette,
        text: darkBg ? '#ffffff' : '#0a0a0a',
        accent: darkBg ? '#ff3b30' : '#d6231f',
      },
    }
  }

  if (fixId === 'left-align-type') {
    return {
      ...design,
      slots: design.slots.map(slot =>
        slot.text ? { ...slot, text: { ...slot.text, align: 'left' } } : slot,
      ),
    }
  }

  if (fixId === 'tighten-hierarchy') {
    const canvas = canvasFor(design.format)
    const margin = design.grid.margin
    const safeW = Math.max(1, canvas.w - margin * 2)
    const safeH = Math.max(1, canvas.h - margin * 2)
    const textSlots = design.slots.filter(slot => slot.text && !slot.hidden)
    const titleSlots = textSlots.filter(isTitleLike)
    const fallback = titleSlots.length
      ? titleSlots
      : [...textSlots].sort((a, b) => resolvedTextStyle(b, design.typography).size - resolvedTextStyle(a, design.typography).size).slice(0, 1)
    const targetIds = new Set(fallback.map(slot => slot.id))

    return {
      ...design,
      slots: design.slots.map(slot => {
        if (!slot.text || !targetIds.has(slot.id)) return slot
        const box = slotBox(canvas, design.grid, slot)
        const resolved = resolvedTextStyle(slot, design.typography)
        const clipped = clippedAmount(box, canvas) > 4 || clippedAmount(estimatedTextBounds(design, slot), canvas) > 12
        const nextW = Math.min(safeW, Math.max(box.w, Math.round(canvas.w * 0.55)))
        const nextH = Math.min(safeH, Math.max(box.h, Math.round(resolved.size * 2.25)))
        const nextX = clamp(box.x, margin, canvas.w - margin - nextW)
        const nextY = clamp(box.y, margin, canvas.h - margin - nextH)
        const nextSize = Math.max(18, Math.round(resolved.size * (clipped ? 0.96 : 1.08)))
        const nextSlot = withOverridden(
          {
            ...slot,
            typeClass: slot.typeClass ?? 'title',
            box: {
              x: Math.round(nextX),
              y: Math.round(nextY),
              w: Math.round(nextW),
              h: Math.round(nextH),
            },
            text: {
              ...slot.text,
              size: nextSize,
              weight: Math.max(slot.text.weight, 800),
              align: 'left',
              fit: 'auto',
            },
          },
          ['size'],
        )
        return nextSlot
      }),
    }
  }

  return {
    ...design,
    slots: design.slots.map(slot => {
      if (!slot.box) return slot
      return { ...slot, box: { ...slot.box, w: Math.round(slot.box.w * 0.92), h: Math.round(slot.box.h * 0.92) } }
    }),
  }
}

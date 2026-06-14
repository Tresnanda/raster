import type { Design } from '../types'
import { canvasFor } from './formats'
import { slotBox } from '../lib/grid'

export type CoachFindingKind = 'contrast' | 'alignment' | 'hierarchy' | 'spacing' | 'occlusion'
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

export function buildGridCoachReport(design: Design): GridCoachReport {
  let score = 100
  const findings: CoachFinding[] = []
  const ratio = contrastRatio(design.palette.bg, design.palette.text)
  const textSlots = design.slots.filter(slot => slot.text && !slot.hidden)
  const bodyCentered = textSlots.filter(slot => (slot.typeClass ?? 'body') !== 'title' && slot.text?.align === 'center')
  const titleSlots = textSlots.filter(slot => (slot.typeClass ?? '') === 'title' || slot.role === 'headline')
  const density = occupiedFraction(design)
  const overlaps = textImageOverlapCount(design)

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
  } else {
    findings.push({
      kind: 'hierarchy',
      severity: 'info',
      message: 'A dominant title layer anchors the composition.',
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
    return {
      ...design,
      slots: design.slots.map(slot =>
        slot.text && ((slot.typeClass ?? '') === 'title' || slot.role === 'headline')
          ? { ...slot, text: { ...slot.text, size: Math.round(slot.text.size * 1.08), weight: Math.max(slot.text.weight, 800) } }
          : slot,
      ),
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

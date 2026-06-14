import { expect, test } from 'vitest'
import type { Design } from '../types'
import { slotBox } from '../lib/grid'
import { buildDesign } from './build'
import { canvasFor } from './formats'
import { applyCoachFix, buildGridCoachReport } from './grid-coach'
import '../archetypes/index'

function clippedHeadlineDesign(): Design {
  const design = buildDesign('mega-word', '4:5', 0)
  return {
    ...design,
    palette: { bg: '#f2f0e8', text: '#111111', accent: '#2454d6' },
    slots: design.slots.map(slot =>
      slot.id === 'word'
        ? {
            ...slot,
            box: { x: 920, y: 520, w: 420, h: 220 },
            content: 'PUSH THE\nLIMITS',
            text: { ...slot.text!, align: 'left' as const, fit: 'fixed' as const, size: 180 },
            overridden: ['size'],
          }
        : slot,
    ),
  }
}

test('buildGridCoachReport rewards a valid Swiss poster with a bounded score', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const report = buildGridCoachReport(design)
  expect(report.score).toBeGreaterThanOrEqual(0)
  expect(report.score).toBeLessThanOrEqual(100)
  expect(report.findings.length).toBeGreaterThan(0)
  expect(report.findings.some(f => f.kind === 'hierarchy')).toBe(true)
})

test('buildGridCoachReport penalizes title text clipped by the canvas edge', () => {
  const report = buildGridCoachReport(clippedHeadlineDesign())

  expect(report.score).toBeLessThan(100)
  expect(report.findings.some(f => /clipped|edge/i.test(f.message))).toBe(true)
  expect(report.findings.some(f => f.fixId === 'tighten-hierarchy')).toBe(true)
})

test('buildGridCoachReport does not offer a hierarchy fix for readable hierarchy', () => {
  const report = buildGridCoachReport(buildDesign('mega-word', '4:5', 0))
  const hierarchy = report.findings.find(f => f.kind === 'hierarchy')

  expect(hierarchy?.fixId).toBeUndefined()
})

test('buildGridCoachReport flags low contrast and centered body text', () => {
  const design: Design = {
    ...buildDesign('mega-word', '4:5', 0),
    palette: { bg: '#111111', text: '#181818', accent: '#222222' },
    slots: buildDesign('mega-word', '4:5', 0).slots.map(slot =>
      slot.text ? { ...slot, text: { ...slot.text, align: 'center' as const } } : slot,
    ),
  }

  const report = buildGridCoachReport(design)
  expect(report.score).toBeLessThan(80)
  expect(report.findings.map(f => f.kind)).toContain('contrast')
  expect(report.findings.map(f => f.kind)).toContain('alignment')
})

test('applyCoachFix can restore contrast and left aligned text', () => {
  const design: Design = {
    ...buildDesign('mega-word', '4:5', 0),
    palette: { bg: '#111111', text: '#181818', accent: '#222222' },
    slots: buildDesign('mega-word', '4:5', 0).slots.map(slot =>
      slot.text ? { ...slot, text: { ...slot.text, align: 'center' as const } } : slot,
    ),
  }

  const contrasted = applyCoachFix(design, 'increase-contrast')
  expect(contrasted.palette.text).toBe('#ffffff')
  const aligned = applyCoachFix(contrasted, 'left-align-type')
  expect(aligned.slots.filter(s => s.text).every(s => s.text!.align === 'left')).toBe(true)
})

test('applyCoachFix tightens hierarchy by making a clipped headline readable', () => {
  const fixed = applyCoachFix(clippedHeadlineDesign(), 'tighten-hierarchy')
  const canvas = canvasFor(fixed.format)
  const word = fixed.slots.find(slot => slot.id === 'word')!
  const box = slotBox(canvas, fixed.grid, word)

  expect(box.x).toBeGreaterThanOrEqual(fixed.grid.margin)
  expect(box.x + box.w).toBeLessThanOrEqual(canvas.w - fixed.grid.margin)
  expect(word.text?.fit).toBe('auto')
  expect(word.text?.align).toBe('left')
  expect(word.overridden).toContain('size')
  expect(buildGridCoachReport(fixed).findings.some(f => /clipped|edge/i.test(f.message))).toBe(false)
})

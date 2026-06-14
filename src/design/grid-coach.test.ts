import { expect, test } from 'vitest'
import type { Design } from '../types'
import { buildDesign } from './build'
import { applyCoachFix, buildGridCoachReport } from './grid-coach'
import '../archetypes/index'

test('buildGridCoachReport rewards a valid Swiss poster with a bounded score', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const report = buildGridCoachReport(design)
  expect(report.score).toBeGreaterThanOrEqual(0)
  expect(report.score).toBeLessThanOrEqual(100)
  expect(report.findings.length).toBeGreaterThan(0)
  expect(report.findings.some(f => f.kind === 'hierarchy')).toBe(true)
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

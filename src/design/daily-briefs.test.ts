import { expect, test } from 'vitest'
import {
  buildDailyBriefDesign,
  dailyBriefForDate,
  dailyBriefSeed,
  DAILY_SWISS_BRIEFS,
} from './daily-briefs'

test('dailyBriefSeed is deterministic for a calendar date', () => {
  expect(dailyBriefSeed('2026-06-14')).toBe(dailyBriefSeed('2026-06-14'))
  expect(dailyBriefSeed('2026-06-14')).not.toBe(dailyBriefSeed('2026-06-15'))
})

test('dailyBriefForDate picks one known Swiss brief deterministically', () => {
  const a = dailyBriefForDate('2026-06-14')
  const b = dailyBriefForDate('2026-06-14')
  expect(a).toEqual(b)
  expect(DAILY_SWISS_BRIEFS.map(brief => brief.id)).toContain(a.id)
  expect(a.constraints.length).toBeGreaterThan(1)
})

test('buildDailyBriefDesign records the applied challenge metadata', () => {
  const { design, brief } = buildDailyBriefDesign('2026-06-14', '4:5')
  expect(design.format).toBe('4:5')
  expect(design.archetype).toBe('generated')
  expect(design.seed).toBe(dailyBriefSeed('2026-06-14'))
  expect(design.generation?.grammar).toBe(brief.grammar)
  expect(design.generation?.brief.density).toBe(brief.density)
})

import { expect, test } from 'vitest'
import { resolveTextStyle } from './resolve-style'
import { DEFAULT_TYPOGRAPHY } from '../design/typeclass'
import type { Slot, Typography } from '../types'

const typography: Typography = {
  ...DEFAULT_TYPOGRAPHY,
  typeface: 'display',
  title: 120,
  headline: 220,
  body: 18,
  tracking: -0.02,
  leading: 0.92,
}

function makeSlot(
  role: Slot['role'],
  typeClass?: Slot['typeClass'],
  overrides: Partial<NonNullable<Slot['text']>> = {},
): Slot {
  return {
    id: 'test',
    role,
    cell: { c: 0, cs: 1, r: 0, rs: 1 },
    content: 'Hello',
    text: {
      family: 'sans',
      weight: 700,
      size: 48,
      tracking: 0,
      leading: 1,
      align: 'left',
      fit: 'fixed',
      ...overrides,
    },
    typeClass,
  }
}

test('title class gets typography size, typeface, tracking, leading', () => {
  const slot = makeSlot('headline') // role headline → classOf = 'title'
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(120)
  expect(result.family).toBe('display')
  expect(result.tracking).toBe(-0.02)
  expect(result.leading).toBe(0.92)
})

test('headline class gets typography size, typeface, tracking, leading', () => {
  const slot = makeSlot('date') // role date → classOf = 'headline'
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(220)
  expect(result.family).toBe('display')
  expect(result.tracking).toBe(-0.02)
  expect(result.leading).toBe(0.92)
})

test('explicit typeClass overrides role-inferred class', () => {
  // role subhead would be body, but explicit typeClass = 'title' makes it title
  const slot = makeSlot('subhead', 'title')
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(120)
  expect(result.family).toBe('display')
  expect(result.tracking).toBe(-0.02)
  expect(result.leading).toBe(0.92)
})

test('body class keeps slot own family, tracking, leading; only size overridden', () => {
  const slot = makeSlot('subhead', undefined, {
    family: 'mono',
    tracking: 0.05,
    leading: 1.4,
    size: 48,
  })
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(18)
  expect(result.family).toBe('mono')
  expect(result.tracking).toBe(0.05)
  expect(result.leading).toBe(1.4)
})

test('body class via caption/index/mark roles', () => {
  for (const role of ['caption', 'index', 'mark', 'subhead'] as const) {
    const slot = makeSlot(role)
    const result = resolveTextStyle(slot, typography)
    expect(result.size).toBe(18)
  }
})

test('preserves weight, align, fit from slot', () => {
  const slot = makeSlot('headline', undefined, { weight: 900, align: 'center', fit: 'auto' })
  const result = resolveTextStyle(slot, typography)
  expect(result.weight).toBe(900)
  expect(result.align).toBe('center')
  expect(result.fit).toBe('auto')
})

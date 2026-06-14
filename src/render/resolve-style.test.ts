import { expect, test } from 'vitest'
import { resolveTextStyle, baselineUnit } from './resolve-style'
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

// ── Override-aware tests ─────────────────────────────────────────────────────

function makeOverriddenSlot(
  role: Slot['role'],
  typeClass: Slot['typeClass'],
  textOverrides: Partial<NonNullable<Slot['text']>>,
  overridden: string[],
): Slot {
  return {
    id: 'override-test',
    role,
    cell: { c: 0, cs: 1, r: 0, rs: 1 },
    content: 'X',
    text: {
      family: 'sans',
      weight: 700,
      size: 48,
      tracking: 0,
      leading: 1,
      align: 'left',
      fit: 'fixed',
      ...textOverrides,
    },
    typeClass,
    overridden,
  }
}

test('title class with no overrides: size = global typography.title', () => {
  const slot = makeOverriddenSlot('headline', 'title', {}, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(typography.title) // 120
})

test('title class with overridden:["size"]: size = slot.text.size (999)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { size: 999 }, ['size'])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(999)
})

test('title class with overridden:["family"]: family = slot.text.family (mono)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { family: 'mono' }, ['family'])
  const result = resolveTextStyle(slot, typography)
  expect(result.family).toBe('mono')
  // size is NOT overridden, so still uses global
  expect(result.size).toBe(typography.title)
})

test('title class with overridden:["tracking"]: tracking = slot.text.tracking (0.05)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { tracking: 0.05 }, ['tracking'])
  const result = resolveTextStyle(slot, typography)
  expect(result.tracking).toBe(0.05)
})

test('title class with overridden:["leading"]: leading = slot.text.leading (1.8)', () => {
  const slot = makeOverriddenSlot('headline', 'title', { leading: 1.8 }, ['leading'])
  const result = resolveTextStyle(slot, typography)
  expect(result.leading).toBe(1.8)
})

test('body class with overridden:["size"]: size = slot.text.size (999)', () => {
  const slot = makeOverriddenSlot('caption', 'body', { size: 999 }, ['size'])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(999)
})

test('body class with empty overridden: size = global typography.body', () => {
  const slot = makeOverriddenSlot('caption', 'body', {}, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.size).toBe(typography.body) // 18
})

test('weight and align are never globally governed; not affected by overridden', () => {
  const slot = makeOverriddenSlot('headline', 'title', { weight: 300, align: 'right' }, [])
  const result = resolveTextStyle(slot, typography)
  expect(result.weight).toBe(300)
  expect(result.align).toBe('right')
})

// ── baselineUnit ─────────────────────────────────────────────────────────────

test('baselineUnit returns round(body * 1.4)', () => {
  expect(baselineUnit({ ...DEFAULT_TYPOGRAPHY, body: 18 })).toBe(25)  // round(18 * 1.4) = round(25.2) = 25
  expect(baselineUnit({ ...DEFAULT_TYPOGRAPHY, body: 16 })).toBe(22)  // round(16 * 1.4) = round(22.4) = 22
  expect(baselineUnit({ ...DEFAULT_TYPOGRAPHY, body: 20 })).toBe(28)  // round(20 * 1.4) = round(28.0) = 28
})

test('baselineUnit with default typography is 25', () => {
  expect(baselineUnit(DEFAULT_TYPOGRAPHY)).toBe(25)
})

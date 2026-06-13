import { expect, test } from 'vitest'
import { mulberry32 } from './rng'

test('same seed yields same sequence', () => {
  const a = mulberry32(42); const b = mulberry32(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
})

test('different seeds diverge', () => {
  const a = mulberry32(1); const b = mulberry32(2)
  expect(a()).not.toEqual(b())
})

test('values are in [0,1)', () => {
  const r = mulberry32(7)
  for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
})

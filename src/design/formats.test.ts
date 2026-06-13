import { expect, test } from 'vitest'
import { FORMATS, canvasFor, defaultGrid } from './formats'

test('every format has a canvas with the right ratio', () => {
  expect(canvasFor('1:1')).toEqual({ w: 1080, h: 1080 })
  const c = canvasFor('16:9')
  expect(c.w / c.h).toBeCloseTo(16 / 9)
})

test('format list is complete', () => {
  expect(Object.keys(FORMATS)).toEqual(['4:5', '2:3', '9:16', '1:1', '16:9'])
})

test('default grid is 12 cols 16 rows', () => {
  expect(defaultGrid().cols).toBe(12)
  expect(defaultGrid().rows).toBe(16)
})

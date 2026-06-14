import { expect, test } from 'vitest'
import { snapToGuides } from './guides'

test('snapToGuides snaps to the nearest guide within threshold', () => {
  expect(snapToGuides(103, [{ axis: 'x', pos: 100 }], 5)).toBe(100)
})

test('snapToGuides leaves values outside threshold alone', () => {
  expect(snapToGuides(108, [{ axis: 'x', pos: 100 }], 5)).toBe(108)
})

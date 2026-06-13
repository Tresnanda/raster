import { expect, test } from 'vitest'
import { classOf, DEFAULT_TYPOGRAPHY, DEFAULT_STYLE } from './typeclass'

test('headline role maps to title class', () => {
  expect(classOf('headline')).toBe('title')
})

test('date and glyph roles map to headline class', () => {
  expect(classOf('date')).toBe('headline')
  expect(classOf('glyph')).toBe('headline')
})

test('remaining text roles map to body class', () => {
  expect(classOf('subhead')).toBe('body')
  expect(classOf('caption')).toBe('body')
  expect(classOf('index')).toBe('body')
  expect(classOf('mark')).toBe('body')
})

test('image and block roles map to body class', () => {
  expect(classOf('image')).toBe('body')
  expect(classOf('block')).toBe('body')
})

test('DEFAULT_TYPOGRAPHY has expected shape', () => {
  expect(DEFAULT_TYPOGRAPHY.typeface).toBe('display')
  expect(DEFAULT_TYPOGRAPHY.title).toBe(120)
  expect(DEFAULT_TYPOGRAPHY.headline).toBe(220)
  expect(DEFAULT_TYPOGRAPHY.body).toBe(18)
  expect(DEFAULT_TYPOGRAPHY.tracking).toBeCloseTo(-0.02)
  expect(DEFAULT_TYPOGRAPHY.leading).toBeCloseTo(0.92)
})

test('DEFAULT_STYLE has expected shape', () => {
  expect(DEFAULT_STYLE.accentHeadline).toBe(false)
  expect(DEFAULT_STYLE.bwImage).toBe(true)
  expect(DEFAULT_STYLE.filmGrain).toBe(true)
  expect(DEFAULT_STYLE.gridOverlay).toBe(false)
})

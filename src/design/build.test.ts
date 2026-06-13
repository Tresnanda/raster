import { expect, test } from 'vitest'
import { buildDesign } from './build'
import '../archetypes/index'

test('builds a design with resolved slot cells from variant 0', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  expect(d.archetype).toBe('mega-word')
  expect(d.format).toBe('4:5')
  expect(d.slots.map(s => s.id).sort()).toEqual(['image', 'mark', 'subhead', 'word'])
  const word = d.slots.find(s => s.id === 'word')!
  expect(word.cell).toEqual({ c: 0, cs: 12, r: 6, rs: 4 })
  expect(word.text?.family).toBe('display')
})

test('seed selects variant deterministically', () => {
  const a = buildDesign('mega-word', '4:5', 1)
  const b = buildDesign('mega-word', '4:5', 1)
  expect(a.slots).toEqual(b.slots)
})

test('dark archetype gets dark default palette', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  expect(d.palette.bg).toBe('#0a0a0a')
  expect(d.palette.text).toBe('#ffffff')
})

test('buildDesign populates typography with defaults', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  expect(d.typography.typeface).toBe('display')
  expect(d.typography.title).toBe(120)
  expect(d.typography.headline).toBe(220)
  expect(d.typography.body).toBe(18)
})

test('buildDesign populates style with defaults', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  expect(d.style.bwImage).toBe(true)
  expect(d.style.filmGrain).toBe(true)
  expect(d.style.accentHeadline).toBe(false)
  expect(d.style.gridOverlay).toBe(false)
})

test('buildDesign sets layout to 1', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  expect(d.layout).toBe(1)
})

test('text slots have typeClass set', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  // 'word' slot has role 'headline' → typeClass 'title'
  const word = d.slots.find(s => s.id === 'word')!
  expect(word.typeClass).toBe('title')
  // 'subhead' role → body
  const subhead = d.slots.find(s => s.id === 'subhead')!
  expect(subhead.typeClass).toBe('body')
})

test('image slot has no typeClass', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  const image = d.slots.find(s => s.id === 'image')!
  expect(image.typeClass).toBeUndefined()
})

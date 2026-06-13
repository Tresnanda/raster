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

import { expect, test, beforeEach } from 'vitest'
import { useDesign } from './useDesign'
import '../archetypes/index'

beforeEach(() => { localStorage.clear(); useDesign.getState().reset('mega-word', '4:5') })

test('reset builds a design for the archetype/format', () => {
  expect(useDesign.getState().design.archetype).toBe('mega-word')
})

test('setContent updates a slot and persists to localStorage', () => {
  useDesign.getState().setContent('word', 'HELLO')
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.content).toBe('HELLO')
  expect(localStorage.getItem('raster:design')).toContain('HELLO')
})

test('shuffle advances the seed', () => {
  const before = useDesign.getState().design.seed
  useDesign.getState().shuffle()
  expect(useDesign.getState().design.seed).not.toBe(before)
})

test('setFormat switches canvas', () => {
  useDesign.getState().setFormat('9:16')
  expect(useDesign.getState().design.format).toBe('9:16')
})

test('setText patches a slot text style', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setText('word', { weight: 900, tracking: -0.05 })
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.text!.weight).toBe(900)
  expect(word.text!.tracking).toBe(-0.05)
})

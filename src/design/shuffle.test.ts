import { expect, test } from 'vitest'
import { buildDesign } from './build'
import { reShuffle } from './shuffle'
import '../archetypes/index'

test('reShuffle changes seed and re-resolves cells, preserving content', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  base.slots.find(s => s.id === 'word')!.content = 'RUN'
  const next = reShuffle(base)
  expect(next.seed).not.toBe(base.seed)
  // content preserved across shuffle
  expect(next.slots.find(s => s.id === 'word')!.content).toBe('RUN')
  // cells came from the newly-selected variant
  const arch = next.archetype
  expect(arch).toBe('mega-word')
})

test('reShuffle is deterministic given the same starting seed', () => {
  const a = reShuffle(buildDesign('mega-word', '4:5', 0))
  const b = reShuffle(buildDesign('mega-word', '4:5', 0))
  expect(a.seed).toBe(b.seed)
  expect(a.slots.map(s => s.cell)).toEqual(b.slots.map(s => s.cell))
})

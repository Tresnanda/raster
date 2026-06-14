import { expect, test } from 'vitest'
import { buildSeries, parseSeriesItems, dominantTextSlot } from './series'
import { buildDesign } from './build'
import '../archetypes/index'

test('parseSeriesItems splits non-empty trimmed lines', () => {
  expect(parseSeriesItems('  A \n\n B \n')).toEqual(['A', 'B'])
})

test('dominantTextSlot picks a title/largest text slot', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  const slot = dominantTextSlot(d)
  expect(slot).toBeDefined()
  expect(slot!.text).toBeDefined()
})

test('buildSeries swaps the dominant text per item, keeping the system', () => {
  const tpl = buildDesign('mega-word', '4:5', 0)
  const target = dominantTextSlot(tpl)!
  const designs = buildSeries(tpl, ['ONE', 'TWO', 'THREE'])
  expect(designs).toHaveLength(3)
  expect(designs[0].slots.find(s => s.id === target.id)!.content).toBe('ONE')
  expect(designs[2].slots.find(s => s.id === target.id)!.content).toBe('THREE')
  // same palette/format/layout across the set
  expect(designs[1].palette).toEqual(tpl.palette)
  expect(designs[1].format).toBe(tpl.format)
})

test('buildSeries returns empty for no items', () => {
  expect(buildSeries(buildDesign('mega-word', '4:5', 0), [])).toEqual([])
})

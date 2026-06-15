import { expect, test } from 'vitest'
import {
  buildCampaignItems,
  buildSeries,
  dominantTextSlot,
  parseSeriesItems,
  updateCampaignItemTitle,
} from './series'
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

test('buildCampaignItems gives each item an editable design snapshot', () => {
  const template = buildDesign('mega-word', '4:5', 0)
  const items = buildCampaignItems(template, ['Run one', 'Run two'], '2026-06-14T08:00:00.000Z')
  expect(items).toHaveLength(2)
  expect(items[0].id).toBe('campaign-1')
  expect(items[0].title).toBe('Run one')
  expect(items[0].design).not.toBe(template)
  expect(items[1].createdAt).toBe('2026-06-14T08:00:00.000Z')
})

test('updateCampaignItemTitle changes one item and its dominant design text', () => {
  const template = buildDesign('mega-word', '4:5', 0)
  const items = buildCampaignItems(template, ['Run one', 'Run two'], '2026-06-14T08:00:00.000Z')
  const next = updateCampaignItemTitle(items, 'campaign-2', 'Run three', '2026-06-14T09:00:00.000Z')
  const target = dominantTextSlot(next[1].design)!

  expect(next[0].title).toBe('Run one')
  expect(next[1].title).toBe('Run three')
  expect(next[1].updatedAt).toBe('2026-06-14T09:00:00.000Z')
  expect(next[1].design.slots.find(s => s.id === target.id)!.content).toBe('Run three')
})

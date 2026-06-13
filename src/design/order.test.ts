import { expect, test } from 'vitest'
import { orderedSlots } from './order'
import type { Design, Slot } from '../types'

function makeSlot(id: string, z?: number): Slot {
  return {
    id, role: 'caption', z,
    cell: { c: 0, cs: 1, r: 0, rs: 1 },
    content: '',
    typeClass: 'body',
  }
}

function makeDesign(slots: Slot[]): Design {
  return {
    format: '3:4',
    grid: { cols: 12, rows: 16, margin: 64, gutter: 24 },
    archetype: 'test',
    palette: { bg: '#000', text: '#fff', accent: '#f00' },
    seed: 0,
    mode: 'grid',
    slots,
    typography: { typeface: 'sans', title: 120, headline: 220, body: 18, tracking: -0.02, leading: 0.92 },
    style: { accentHeadline: false, bwImage: false, filmGrain: false, gridOverlay: false },
    layout: 1,
  }
}

test('orderedSlots returns slots sorted by z ascending', () => {
  const d = makeDesign([
    makeSlot('c', 2),
    makeSlot('a', 0),
    makeSlot('b', 1),
  ])
  const ordered = orderedSlots(d)
  expect(ordered.map(s => s.id)).toEqual(['a', 'b', 'c'])
})

test('orderedSlots falls back to array index for slots without z', () => {
  const d = makeDesign([
    makeSlot('first'),  // no z → index 0
    makeSlot('second'), // no z → index 1
    makeSlot('third'),  // no z → index 2
  ])
  const ordered = orderedSlots(d)
  expect(ordered.map(s => s.id)).toEqual(['first', 'second', 'third'])
})

test('orderedSlots does not mutate the original design.slots array', () => {
  const d = makeDesign([makeSlot('b', 1), makeSlot('a', 0)])
  const before = d.slots.map(s => s.id)
  orderedSlots(d)
  expect(d.slots.map(s => s.id)).toEqual(before)
})

test('orderedSlots handles empty slots', () => {
  const d = makeDesign([])
  expect(orderedSlots(d)).toEqual([])
})

test('orderedSlots with mixed z and no-z falls back correctly', () => {
  const d = makeDesign([
    makeSlot('x', 10),
    makeSlot('y'),       // no z → array index 1
    makeSlot('z', 5),
  ])
  const ordered = orderedSlots(d)
  // y has z=undefined → falls back to index 1
  // z has z=5, x has z=10
  // order: y(1) < z(5) < x(10)
  expect(ordered.map(s => s.id)).toEqual(['y', 'z', 'x'])
})

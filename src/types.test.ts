import { expect, test } from 'vitest'
import type { Design, Slot } from './types'

test('Design shape is constructible', () => {
  const d: Design = {
    format: '4:5',
    grid: { cols: 12, rows: 16, margin: 64, gutter: 24 },
    archetype: 'mega-word',
    palette: { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' },
    seed: 1,
    mode: 'grid',
    slots: [],
    typography: { typeface: 'display', title: 120, headline: 220, body: 18, tracking: -0.02, leading: 0.92 },
    style: { accentHeadline: false, bwImage: true, filmGrain: true, gridOverlay: false },
    layout: 1,
  }
  expect(d.slots).toEqual([])
})

test('Slot accepts optional transform fields', () => {
  const s: Slot = {
    id: 'x', role: 'block', cell: { c: 0, cs: 1, r: 0, rs: 1 }, content: '',
    rotation: 45, flipH: true, flipV: false, radius: 20,
    stroke: '#ff0000', strokeWidth: 2,
    shadow: { dx: 0, dy: 8, blur: 16, color: '#000000' },
    blend: 'multiply',
  }
  expect(s.rotation).toBe(45)
  expect(s.shadow?.blur).toBe(16)
})

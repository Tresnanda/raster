import { expect, test } from 'vitest'
import type { Design } from './types'

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

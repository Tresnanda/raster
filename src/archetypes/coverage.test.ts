import { expect, test } from 'vitest'
import { listArchetypes } from './index'
import { buildDesign } from '../design/build'

test('all 12 archetypes are registered', () => {
  const ids = listArchetypes().map(a => a.id).sort()
  expect(ids).toEqual([
    'all-type', 'editorial-grid', 'full-bleed-corners', 'glyph-frame',
    'grid-overlay-figure', 'headline-list', 'index-contents', 'mega-word',
    'modular-bento', 'number-feature', 'sidebar-rail', 'split-diptych',
  ])
})

test('each archetype has at least 2 variants', () => {
  for (const a of listArchetypes()) expect(a.variants.length).toBeGreaterThanOrEqual(2)
})

test('buildDesign succeeds for every archetype and all slot cells are defined', () => {
  for (const a of listArchetypes()) {
    const d = buildDesign(a.id, '4:5', 0)
    for (const slot of d.slots) {
      expect(slot.cell, `${a.id}/${slot.id} cell undefined`).toBeDefined()
      expect(slot.cell.c, `${a.id}/${slot.id} .c`).toBeTypeOf('number')
      expect(slot.cell.cs, `${a.id}/${slot.id} .cs`).toBeTypeOf('number')
      expect(slot.cell.r, `${a.id}/${slot.id} .r`).toBeTypeOf('number')
      expect(slot.cell.rs, `${a.id}/${slot.id} .rs`).toBeTypeOf('number')
    }
  }
})

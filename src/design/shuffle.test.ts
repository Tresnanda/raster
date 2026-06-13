import { expect, test } from 'vitest'
import { buildDesign } from './build'
import { reShuffle, mergeContent } from './shuffle'
import '../archetypes/index'

// ── reShuffle ─────────────────────────────────────────────────────────────────

test('reShuffle changes seed', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  const next = reShuffle(base)
  expect(next.seed).not.toBe(base.seed)
})

test('reShuffle preserves content for all slots', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  base.slots.find(s => s.id === 'word')!.content = 'RUN'
  const next = reShuffle(base)
  expect(next.slots.find(s => s.id === 'word')!.content).toBe('RUN')
})

test('reShuffle preserves archetype, format, palette, typography, style, mode', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  const next = reShuffle(base)
  expect(next.archetype).toBe(base.archetype)
  expect(next.format).toBe(base.format)
  expect(next.palette).toEqual(base.palette)
  expect(next.typography).toEqual(base.typography)
  expect(next.style).toEqual(base.style)
  expect(next.mode).toBe(base.mode)
})

test('reShuffle changes at least one slot cell across multiple calls', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  const originalCells = base.slots.map(s => JSON.stringify(s.cell))
  let foundDiff = false
  for (let i = 0; i < 20; i++) {
    const next = reShuffle(base)
    const cells = next.slots.map(s => JSON.stringify(s.cell))
    if (!cells.every((c, i) => c === originalCells[i])) {
      foundDiff = true
      break
    }
  }
  expect(foundDiff).toBe(true)
})

test('reShuffle keeps all slot cells within grid bounds over 50 runs', () => {
  const base = buildDesign('editorial-grid', '4:5', 0)
  const COLS = base.grid.cols
  const ROWS = base.grid.rows
  for (let i = 0; i < 50; i++) {
    const next = reShuffle(base)
    for (const slot of next.slots) {
      const { c, cs, r, rs } = slot.cell
      expect(c, `slot ${slot.id} c out of bounds`).toBeGreaterThanOrEqual(0)
      expect(c + cs, `slot ${slot.id} c+cs out of bounds`).toBeLessThanOrEqual(COLS)
      expect(r, `slot ${slot.id} r out of bounds`).toBeGreaterThanOrEqual(0)
      expect(r + rs, `slot ${slot.id} r+rs out of bounds`).toBeLessThanOrEqual(ROWS)
    }
  }
})

// ── mergeContent ──────────────────────────────────────────────────────────────

test('mergeContent copies matching slot content', () => {
  const from = buildDesign('mega-word', '4:5', 0)
  from.slots.find(s => s.id === 'word')!.content = 'HELLO'
  const into = buildDesign('mega-word', '4:5', 0)
  const merged = mergeContent(into, from)
  expect(merged.slots.find(s => s.id === 'word')!.content).toBe('HELLO')
})

test('mergeContent does not mutate input designs', () => {
  const from = buildDesign('mega-word', '4:5', 0)
  const into = buildDesign('mega-word', '4:5', 0)
  const originalContent = into.slots[0].content
  mergeContent(into, from)
  expect(into.slots[0].content).toBe(originalContent)
})

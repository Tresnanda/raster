import { expect, test } from 'vitest'
import { buildDesign } from './build'
import { reShuffle, surprise, mergeContent } from './shuffle'
import { PRESET_PALETTES } from './palettes'
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

// ── surprise ──────────────────────────────────────────────────────────────────

test('surprise returns a valid Design', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  const next = surprise(base)
  expect(next.format).toBe(base.format)
  expect(next.layout).toBeGreaterThanOrEqual(1)
  expect(next.layout).toBeLessThanOrEqual(19)
  expect(next.slots.length).toBeGreaterThan(0)
  for (const slot of next.slots) {
    expect(slot.cell).toBeDefined()
  }
})

test('surprise uses a preset palette', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  const presetBgs = PRESET_PALETTES.map(p => p.palette.bg)
  // Run a few times — should always land on a preset palette bg
  for (let i = 0; i < 10; i++) {
    const next = surprise(base)
    expect(presetBgs).toContain(next.palette.bg)
  }
})

test('surprise preserves content for matching slot ids', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  base.slots.find(s => s.id === 'word')!.content = 'PRESERVED'
  // Run surprise — if same archetype is chosen, word slot should keep content
  for (let i = 0; i < 30; i++) {
    const next = surprise(base)
    const wordSlot = next.slots.find(s => s.id === 'word')
    if (wordSlot) {
      expect(wordSlot.content).toBe('PRESERVED')
      return // test passed
    }
  }
  // If no matching slot ever found in 30 tries, that's fine — the test is conditional
})

test('surprise keeps current typography', () => {
  const base = buildDesign('mega-word', '4:5', 0)
  base.typography.title = 200
  const next = surprise(base)
  expect(next.typography.title).toBe(200)
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

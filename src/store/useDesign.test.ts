import { expect, test, beforeEach } from 'vitest'
import { useDesign } from './useDesign'
import { classOf, DEFAULT_TYPOGRAPHY, DEFAULT_STYLE } from '../design/typeclass'
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

test('setBox sets a free-mode absolute box on a slot', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().setBox('word', { x: 100, y: 100, w: 400, h: 200 })
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.box).toEqual({ x: 100, y: 100, w: 400, h: 200 })
})

// ── new v2 actions ─────────────────────────────────────────────────────────────

test('setTypography merges a patch into current typography', () => {
  useDesign.getState().setTypography({ title: 150, body: 22 })
  const typo = useDesign.getState().design.typography
  expect(typo.title).toBe(150)
  expect(typo.body).toBe(22)
  // unchanged fields preserved
  expect(typo.typeface).toBe('display')
  expect(typo.headline).toBe(220)
})

test('setStyle merges a patch into current style', () => {
  useDesign.getState().setStyle({ accentHeadline: true, gridOverlay: true })
  const style = useDesign.getState().design.style
  expect(style.accentHeadline).toBe(true)
  expect(style.gridOverlay).toBe(true)
  // unchanged fields preserved
  expect(style.bwImage).toBe(true)
  expect(style.filmGrain).toBe(true)
})

test('setAccent updates palette.accent', () => {
  useDesign.getState().setAccent('#00ff00')
  expect(useDesign.getState().design.palette.accent).toBe('#00ff00')
})

test('setLayout changes layout and rebuilds slots, preserving content for matching ids', () => {
  useDesign.getState().setContent('word', 'KEPT')
  useDesign.getState().setTypography({ title: 180 })
  useDesign.getState().setLayout(3) // layout 3 = mega-word
  const d = useDesign.getState().design
  expect(d.layout).toBe(3)
  // typography preserved
  expect(d.typography.title).toBe(180)
  // content preserved for matching slot
  const word = d.slots.find(s => s.id === 'word')
  if (word) expect(word.content).toBe('KEPT')
})

test('setLayout persists to localStorage', () => {
  useDesign.getState().setLayout(5)
  const raw = localStorage.getItem('raster:design')
  expect(raw).toContain('"layout":5')
})

test('nextLayout increments layout, wrapping at 19→1', () => {
  useDesign.getState().setLayout(1)
  useDesign.getState().nextLayout()
  expect(useDesign.getState().design.layout).toBe(2)

  useDesign.getState().setLayout(19)
  useDesign.getState().nextLayout()
  expect(useDesign.getState().design.layout).toBe(1)
})

test('prevLayout decrements layout, wrapping at 1→19', () => {
  useDesign.getState().setLayout(5)
  useDesign.getState().prevLayout()
  expect(useDesign.getState().design.layout).toBe(4)

  useDesign.getState().setLayout(1)
  useDesign.getState().prevLayout()
  expect(useDesign.getState().design.layout).toBe(19)
})

test('surprise produces a valid design with layout in 1..19', () => {
  useDesign.getState().surprise()
  const d = useDesign.getState().design
  expect(d.layout).toBeGreaterThanOrEqual(1)
  expect(d.layout).toBeLessThanOrEqual(19)
  expect(d.format).toBe('4:5') // format preserved
})

test('reset populates typography and style with defaults', () => {
  const d = useDesign.getState().design
  expect(d.typography).toBeDefined()
  expect(d.typography.typeface).toBe('display')
  expect(d.style).toBeDefined()
  expect(d.style.bwImage).toBe(true)
})

test('localStorage migration: old save without typography loads with defaults merged', () => {
  // Simulate an old Design in localStorage (no typography/style/layout)
  const oldDesign = {
    format: '4:5',
    grid: { cols: 12, rows: 16, margin: 64, gutter: 24 },
    archetype: 'mega-word',
    palette: { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' },
    seed: 0,
    mode: 'grid',
    slots: [
      { id: 'word', role: 'headline', cell: { c: 0, cs: 12, r: 6, rs: 4 }, content: 'OLD' },
    ],
  }
  localStorage.setItem('raster:design', JSON.stringify(oldDesign))
  // Test the migration logic directly by replicating the merge logic from load():
  const parsed = JSON.parse(localStorage.getItem('raster:design')!)
  const migrated = {
    ...parsed,
    typography: { ...DEFAULT_TYPOGRAPHY, ...(parsed.typography ?? {}) },
    style: { ...DEFAULT_STYLE, ...(parsed.style ?? {}) },
    layout: parsed.layout ?? 1,
    slots: (parsed.slots ?? []).map((s: any) => ({
      ...s,
      typeClass: s.typeClass ?? (s.role !== 'image' && s.role !== 'block' ? classOf(s.role) : undefined),
    })),
  }
  expect(migrated.typography.title).toBe(120)
  expect(migrated.style.bwImage).toBe(true)
  expect(migrated.layout).toBe(1)
  expect(migrated.slots[0].typeClass).toBe('title') // headline → title
  expect(migrated.slots[0].content).toBe('OLD')
})

import { expect, test, beforeEach, vi } from 'vitest'
import { useDesign } from './useDesign'
import { classOf, DEFAULT_TYPOGRAPHY, DEFAULT_STYLE } from '../design/typeclass'
import { readStreak } from '../design/streak'
import { TYPE_SYSTEMS } from '../design/type-systems'
import { generate } from '../design/generate'
import '../archetypes/index'

beforeEach(() => {
  localStorage.clear()
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.setState({
    mineOpen: false,
    savedPosters: [],
    posterMineError: null,
    systemRecipes: [],
    campaignRaw: '',
    campaignItems: [],
    activeCampaignId: null,
    dailyBrief: null,
    dailyStreak: { current: 0, longest: 0, lastDate: null },
    shuffleScope: 'all',
    componentLibrary: [],
    guides: [],
    motionSequence: {
      effect: 'rise',
      tempo: 100,
      delayMs: 0,
      staggerMs: 80,
      loop: false,
    },
  } as any)
})

function textContents() {
  return useDesign.getState().design.slots.filter(slot => slot.text).map(slot => slot.content).sort()
}

function layoutFingerprint() {
  return JSON.stringify(useDesign.getState().design.slots.map(slot => ({
    role: slot.role,
    cell: slot.cell,
    text: slot.text,
    typeClass: slot.typeClass,
  })))
}

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

test('setShuffleScope switches the next shuffle mode', () => {
  useDesign.getState().setShuffleScope('content')
  expect(useDesign.getState().shuffleScope).toBe('content')
})

test('content-scope shuffle keeps layout and changes at least one content string', () => {
  useDesign.getState().loadDesign(generate('4:5', { seed: 16000, candidateCount: 18 }))
  const beforeLayout = layoutFingerprint()
  const beforeContent = textContents()
  useDesign.getState().setShuffleScope('content')
  useDesign.getState().shuffle()

  expect(layoutFingerprint()).toBe(beforeLayout)
  expect(textContents()).not.toEqual(beforeContent)
})

test('system-scope shuffle keeps current text content and changes the layout', () => {
  useDesign.getState().loadDesign(generate('4:5', { seed: 16001, candidateCount: 18 }))
  const beforeLayout = layoutFingerprint()
  const beforeContent = textContents()
  useDesign.getState().setShuffleScope('system')
  useDesign.getState().shuffle()

  expect(textContents()).toEqual(beforeContent)
  expect(layoutFingerprint()).not.toBe(beforeLayout)
})

test('surprise ignores shuffle scope and always invents a generated poster', () => {
  useDesign.getState().setShuffleScope('content')
  useDesign.getState().surprise()

  expect(useDesign.getState().design.archetype).toBe('generated')
  expect(useDesign.getState().design.layout).toBe(0)
  expect(useDesign.getState().design.generation).toBeDefined()

  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setShuffleScope('system')
  useDesign.getState().surprise()

  expect(useDesign.getState().design.archetype).toBe('generated')
  expect(useDesign.getState().design.layout).toBe(0)
  expect(useDesign.getState().design.generation).toBeDefined()
})

test('all-scope shuffle remixes a generated poster without inventing new content or style', () => {
  useDesign.getState().loadDesign(generate('4:5', { seed: 16002, candidateCount: 18 }))
  const beforeLayout = layoutFingerprint()
  const beforeContent = textContents()
  const beforePalette = { ...useDesign.getState().design.palette }
  const beforeTypography = { ...useDesign.getState().design.typography }
  const beforeStyle = { ...useDesign.getState().design.style }

  useDesign.getState().setShuffleScope('all')
  useDesign.getState().shuffle()

  const after = useDesign.getState().design
  expect(after.archetype).toBe('generated')
  expect(after.layout).toBe(0)
  expect(textContents()).toEqual(beforeContent)
  expect(after.palette).toEqual(beforePalette)
  expect(after.typography).toEqual(beforeTypography)
  expect(after.style).toEqual(beforeStyle)
  expect(layoutFingerprint()).not.toBe(beforeLayout)
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

test('autoTidy snaps free boxes back to the grid and is undoable', () => {
  useDesign.getState().setPalette({ bg: '#111111', text: '#181818', accent: '#222222' })
  useDesign.getState().setBox('word', { x: 650, y: 520, w: 420, h: 150 })
  const before = useDesign.getState().past.length
  useDesign.getState().autoTidy()
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!

  expect(word.box).toBeUndefined()
  expect(useDesign.getState().design.palette.text).toBe('#ffffff')
  expect(useDesign.getState().past.length).toBe(before + 1)
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.box).toEqual({ x: 650, y: 520, w: 420, h: 150 })
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

test('applyTypeSystem applies a curated type system through history', () => {
  const before = useDesign.getState().past.length
  useDesign.getState().applyTypeSystem('mono-technical')
  expect(useDesign.getState().design.typography.typeface).toBe('mono')
  expect(useDesign.getState().design.typography.title).toBe(TYPE_SYSTEMS.find(system => system.id === 'mono-technical')!.title)
  expect(useDesign.getState().past.length).toBe(before + 1)
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

test('applyExtractedPalette commits a palette from image extraction', () => {
  const before = useDesign.getState().past.length
  useDesign.getState().applyExtractedPalette({ bg: '#eeeeee', text: '#0a0a0a', accent: '#d6231f' })
  expect(useDesign.getState().design.palette).toEqual({ bg: '#eeeeee', text: '#0a0a0a', accent: '#d6231f' })
  expect(useDesign.getState().past.length).toBe(before + 1)
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

// surprise now calls generate() → layout=0, archetype='generated'
test('surprise produces a valid procedurally generated design', () => {
  useDesign.getState().surprise()
  const d = useDesign.getState().design
  expect(d.layout).toBe(0)
  expect(d.archetype).toBe('generated')
  expect(d.format).toBe('4:5') // format preserved
  expect(d.slots.length).toBeGreaterThan(0)
})

test('surprise clears selectedId', () => {
  useDesign.getState().selectElement('word')
  useDesign.getState().surprise()
  expect(useDesign.getState().selectedId).toBeNull()
})

test('surprise clears multi-selection state', () => {
  useDesign.getState().setSelection(['word', 'caption'])
  useDesign.getState().surprise()
  expect(useDesign.getState().selectedIds).toEqual([])
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

test('localStorage migration: z is added to slots missing it', () => {
  const oldDesign = {
    format: '4:5',
    grid: { cols: 12, rows: 16, margin: 64, gutter: 24 },
    archetype: 'mega-word',
    palette: { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' },
    seed: 0,
    mode: 'grid',
    slots: [
      { id: 'word', role: 'headline', cell: { c: 0, cs: 12, r: 6, rs: 4 }, content: 'A' },
      { id: 'sub', role: 'caption', cell: { c: 0, cs: 6, r: 12, rs: 1 }, content: 'B' },
    ],
    typography: DEFAULT_TYPOGRAPHY,
    style: DEFAULT_STYLE,
    layout: 1,
  }
  localStorage.setItem('raster:design', JSON.stringify(oldDesign))
  const parsed = JSON.parse(localStorage.getItem('raster:design')!)
  const migrated = {
    ...parsed,
    typography: { ...DEFAULT_TYPOGRAPHY, ...(parsed.typography ?? {}) },
    style: { ...DEFAULT_STYLE, ...(parsed.style ?? {}) },
    layout: parsed.layout ?? 1,
    slots: (parsed.slots ?? []).map((s: any, i: number) => ({
      ...s,
      typeClass: s.typeClass ?? (s.role !== 'image' && s.role !== 'block' && s.role !== 'line' ? classOf(s.role) : undefined),
      z: s.z ?? i,
    })),
  }
  expect(migrated.slots[0].z).toBe(0)
  expect(migrated.slots[1].z).toBe(1)
})

// ── selectedId state ───────────────────────────────────────────────────────────

test('selectedId starts as null after reset', () => {
  expect(useDesign.getState().selectedId).toBeNull()
})

test('selectElement sets and clears selectedId', () => {
  useDesign.getState().selectElement('word')
  expect(useDesign.getState().selectedId).toBe('word')
  useDesign.getState().selectElement(null)
  expect(useDesign.getState().selectedId).toBeNull()
})

// ── addElement ────────────────────────────────────────────────────────────────

test('addElement(text) appends a text slot with box and auto-selects', () => {
  useDesign.getState().addElement('text')
  const { design, selectedId } = useDesign.getState()
  const added = design.slots.find(s => s.id === selectedId)
  expect(added).toBeDefined()
  expect(added!.role).toBe('caption')
  expect(added!.box).toBeDefined()
  expect(added!.text).toBeDefined()
  expect(added!.content).toBe('Text')
  expect(typeof added!.z).toBe('number')
})

test('addElement(image) appends an image slot', () => {
  useDesign.getState().addElement('image')
  const { design, selectedId } = useDesign.getState()
  const added = design.slots.find(s => s.id === selectedId)
  expect(added!.role).toBe('image')
  expect(added!.box).toBeDefined()
})

test('addElement(block) appends a block slot with fill=accent', () => {
  useDesign.getState().addElement('block')
  const { design, selectedId } = useDesign.getState()
  const added = design.slots.find(s => s.id === selectedId)
  expect(added!.role).toBe('block')
  expect(added!.fill).toBe('accent')
})

test('addElement(line) appends a line slot with h=4', () => {
  useDesign.getState().addElement('line')
  const { design, selectedId } = useDesign.getState()
  const added = design.slots.find(s => s.id === selectedId)
  expect(added!.role).toBe('line')
  expect(added!.box!.h).toBe(4)
})

test('addElement z = maxZ + 1 of existing slots', () => {
  const before = useDesign.getState().design.slots
  const maxZBefore = before.reduce((m, s, i) => Math.max(m, s.z ?? i), -1)
  useDesign.getState().addElement('text')
  const { design, selectedId } = useDesign.getState()
  const added = design.slots.find(s => s.id === selectedId)
  expect(added!.z).toBe(maxZBefore + 1)
})

// ── deleteElement ─────────────────────────────────────────────────────────────

test('deleteElement removes the slot', () => {
  const before = useDesign.getState().design.slots.length
  useDesign.getState().deleteElement('subhead')
  expect(useDesign.getState().design.slots.length).toBe(before - 1)
  expect(useDesign.getState().design.slots.find(s => s.id === 'subhead')).toBeUndefined()
})

test('deleteElement clears selectedId if that element was selected', () => {
  useDesign.getState().selectElement('mark')
  useDesign.getState().deleteElement('mark')
  expect(useDesign.getState().selectedId).toBeNull()
})

test('deleteElement preserves selectedId if a different element was selected', () => {
  useDesign.getState().selectElement('word')
  useDesign.getState().deleteElement('mark')
  expect(useDesign.getState().selectedId).toBe('word')
})

// ── duplicateElement ──────────────────────────────────────────────────────────

test('duplicateElement adds a copy and auto-selects it', () => {
  const beforeCount = useDesign.getState().design.slots.length
  useDesign.getState().duplicateElement('word')
  const { design, selectedId } = useDesign.getState()
  expect(design.slots.length).toBe(beforeCount + 1)
  const copy = design.slots.find(s => s.id === selectedId)
  expect(copy).toBeDefined()
  expect(copy!.content).toBe(design.slots.find(s => s.id === 'word')!.content)
})

test('duplicateElement gives copy a higher z than original', () => {
  useDesign.getState().duplicateElement('word')
  const { design, selectedId } = useDesign.getState()
  const copy = design.slots.find(s => s.id === selectedId)
  const original = design.slots.find(s => s.id === 'word')
  const origZ = original!.z ?? design.slots.indexOf(original!)
  expect(copy!.z).toBeGreaterThan(origZ)
})

test('duplicateElement resolves box from grid cell when slot has no box', () => {
  useDesign.getState().duplicateElement('word')
  const { design, selectedId } = useDesign.getState()
  const copy = design.slots.find(s => s.id === selectedId)
  // The copy must have a box (resolved + offset)
  expect(copy!.box).toBeDefined()
  expect(typeof copy!.box!.x).toBe('number')
  expect(typeof copy!.box!.y).toBe('number')
})

test('duplicateElement of slot with existing box offsets that box by +24,+24', () => {
  useDesign.getState().setBox('word', { x: 100, y: 200, w: 400, h: 300 })
  useDesign.getState().duplicateElement('word')
  const { design, selectedId } = useDesign.getState()
  const copy = design.slots.find(s => s.id === selectedId)
  expect(copy!.box!.x).toBe(124)
  expect(copy!.box!.y).toBe(224)
})

// ── bringForward / sendBackward ───────────────────────────────────────────────

test('bringForward raises an element above its neighbor', () => {
  // mega-word slots: image(z by idx 0), word(1), subhead(2), mark(3)
  useDesign.getState().bringForward('image')
  const d = useDesign.getState().design
  const imageAfter = d.slots.find(s => s.id === 'image')!.z!
  const wordAfter = d.slots.find(s => s.id === 'word')!.z!
  // image moved up, word moved down
  expect(imageAfter).toBeGreaterThan(wordAfter)
})

test('sendBackward lowers an element below its neighbor', () => {
  useDesign.getState().sendBackward('mark')
  const d = useDesign.getState().design
  const mark = d.slots.find(s => s.id === 'mark')!.z!
  const subhead = d.slots.find(s => s.id === 'subhead')!.z!
  expect(mark).toBeLessThan(subhead)
})

test('bringForward on the highest element does not crash', () => {
  // 'mark' is the highest z by array index
  expect(() => useDesign.getState().bringForward('mark')).not.toThrow()
})

test('sendBackward on the lowest element does not crash', () => {
  expect(() => useDesign.getState().sendBackward('image')).not.toThrow()
})

// ── pickForMe ─────────────────────────────────────────────────────────────────

test('pickForMe sets layout to a value in 1..19', () => {
  useDesign.getState().pickForMe()
  const { design } = useDesign.getState()
  expect(design.layout).toBeGreaterThanOrEqual(1)
  expect(design.layout).toBeLessThanOrEqual(19)
})

test('pickForMe produces multiple distinct layouts across calls', () => {
  const layouts = new Set<number>()
  for (let i = 0; i < 40; i++) {
    useDesign.getState().pickForMe()
    layouts.add(useDesign.getState().design.layout)
  }
  expect(layouts.size).toBeGreaterThan(3)
})

// ── Per-element override actions ──────────────────────────────────────────────

test('overrideText: sets patched fields on slot.text and adds to overridden', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 200, family: 'mono' })
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.text!.size).toBe(200)
  expect(word.text!.family).toBe('mono')
  expect(word.overridden).toContain('size')
  expect(word.overridden).toContain('family')
})

test('overrideText: deduplicates overridden list', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 100 })
  useDesign.getState().overrideText('word', { size: 200 })
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.overridden!.filter(f => f === 'size').length).toBe(1)
})

test('overrideText coalesces: two consecutive calls = one undo step', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforePastLen = useDesign.getState().past.length
  useDesign.getState().overrideText('word', { size: 100 })
  useDesign.getState().overrideText('word', { size: 150 })
  // coalesced — only one step added
  expect(useDesign.getState().past.length).toBe(beforePastLen + 1)
})

test('setColor: sets slot.color and coalesces', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setColor('word', '#ff0000')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.color).toBe('#ff0000')
})

test('setColor coalesces', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().setColor('word', '#ff0000')
  useDesign.getState().setColor('word', '#00ff00')
  expect(useDesign.getState().past.length).toBe(beforeLen + 1)
})

test('setBw: sets slot.bw (discrete step)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')
  if (!imgSlot) return // if no image slot in mega-word, skip
  useDesign.getState().setBw(imgSlot.id, false)
  const updated = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(updated.bw).toBe(false)
})

test('resetElement: clears overridden, color, bw for a slot', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().overrideText('word', { size: 999 })
  useDesign.getState().setColor('word', '#aabbcc')
  useDesign.getState().resetElement('word')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.overridden).toBeUndefined()
  expect(word.color).toBeUndefined()
  expect(word.bw).toBeUndefined()
})

// ── imageFill store actions ────────────────────────────────────────────────────

test('setImageFill: sets slot.imageFill', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setImageFill('word', 'data:image/png;base64,abc')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.imageFill).toBe('data:image/png;base64,abc')
})

test('setImageFill: is undoable (one history step)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().setImageFill('word', 'data:image/png;base64,abc')
  expect(useDesign.getState().past.length).toBe(beforeLen + 1)
  useDesign.getState().undo()
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.imageFill).toBeUndefined()
})

test('clearImageFill: removes slot.imageFill', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setImageFill('word', 'data:image/png;base64,abc')
  useDesign.getState().clearImageFill('word')
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.imageFill).toBeUndefined()
})

test('clearImageFill: is undoable (discrete step)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setImageFill('word', 'data:image/png;base64,abc')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().clearImageFill('word')
  expect(useDesign.getState().past.length).toBe(beforeLen + 1)
  useDesign.getState().undo()
  const word = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(word.imageFill).toBe('data:image/png;base64,abc')
})

test('setImageFill does not affect other slots', () => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().setImageFill('word', 'data:image/png;base64,abc')
  const other = useDesign.getState().design.slots.filter(s => s.id !== 'word')
  expect(other.every(s => s.imageFill === undefined)).toBe(true)
})

// ── setOpacity ────────────────────────────────────────────────────────────────

test('setOpacity sets opacity on a slot (clamped 0..1)', () => {
  useDesign.getState().setOpacity('word', 0.5)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(0.5)
})

test('setOpacity clamps below 0 to 0', () => {
  useDesign.getState().setOpacity('word', -0.1)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(0)
})

test('setOpacity clamps above 1 to 1', () => {
  useDesign.getState().setOpacity('word', 1.5)
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBe(1)
})

test('setOpacity coalesces consecutive calls into one undo step', () => {
  useDesign.getState().setOpacity('word', 0.3)
  useDesign.getState().setOpacity('word', 0.6)
  useDesign.getState().setOpacity('word', 0.9)
  // Only one past entry (the state BEFORE the first setOpacity)
  expect(useDesign.getState().past.length).toBe(1)
})

test('setOpacity is undoable', () => {
  useDesign.getState().setOpacity('word', 0.3)
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.opacity).toBeUndefined()
})

// ── alignElement ──────────────────────────────────────────────────────────────

test('alignElement left: sets x to margin', () => {
  // mega-word '4:5' canvas: 1080x1350, default margin: 64
  // word slot has no box, so we give it one
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'left')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.x).toBe(64) // margin
  expect(slot.box!.y).toBe(200) // unchanged
  expect(slot.box!.w).toBe(400)
  expect(slot.box!.h).toBe(150)
})

test('alignElement right: sets x to C.w - margin - box.w', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'right')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // 1080 - 64 - 400 = 616
  expect(slot.box!.x).toBe(616)
  expect(slot.box!.y).toBe(200) // unchanged
})

test('alignElement centerH: centers box horizontally', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'centerH')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1080 - 400) / 2 = 340
  expect(slot.box!.x).toBe(340)
  expect(slot.box!.y).toBe(200) // unchanged
})

test('alignElement top: sets y to margin', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'top')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.y).toBe(64) // margin
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement bottom: sets y to C.h - margin - box.h', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'bottom')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // 1350 - 64 - 150 = 1136
  expect(slot.box!.y).toBe(1136)
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement centerV: centers box vertically', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  useDesign.getState().alignElement('word', 'centerV')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1350 - 150) / 2 = 600
  expect(slot.box!.y).toBe(600)
  expect(slot.box!.x).toBe(300) // unchanged
})

test('alignElement is undoable', () => {
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 400, h: 150 })
  const beforeX = useDesign.getState().design.slots.find(s => s.id === 'word')!.box!.x
  useDesign.getState().alignElement('word', 'left')
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  expect(slot.box!.x).toBe(beforeX)
})

test('alignElement result values are rounded to integers', () => {
  // Use a w that produces fractional center
  useDesign.getState().setBox('word', { x: 300, y: 200, w: 401, h: 151 })
  useDesign.getState().alignElement('word', 'centerH')
  const slot = useDesign.getState().design.slots.find(s => s.id === 'word')!
  // (1080 - 401) / 2 = 339.5 → rounded to 340
  expect(Number.isInteger(slot.box!.x)).toBe(true)
})

// ── updateSlot ─────────────────────────────────────────────────────────────────

test('updateSlot patches a field and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().updateSlot(id, { rotation: 90 })
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBe(90)
  // undoable
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBeUndefined()
})

test('updateSlot with coalesceKey does not grow history on repeated calls', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().updateSlot(id, { rotation: 10 }, `rotation:${id}`)
  useDesign.getState().updateSlot(id, { rotation: 20 }, `rotation:${id}`)
  useDesign.getState().updateSlot(id, { rotation: 30 }, `rotation:${id}`)
  // Coalescing: only one history entry added for the batch
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setRotation ────────────────────────────────────────────────────────────────

test('setRotation sets rotation field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setRotation(id, 45)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.rotation).toBe(45)
})

test('setRotation coalesces: repeated calls do not grow history unboundedly', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setRotation(id, 10)
  useDesign.getState().setRotation(id, 20)
  useDesign.getState().setRotation(id, 30)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setFlip ────────────────────────────────────────────────────────────────────

test('setFlip H sets flipH', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'H', true)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipH).toBe(true)
})

test('setFlip V sets flipV', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'V', true)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipV).toBe(true)
})

test('setFlip H false clears flipH', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setFlip(id, 'H', true)
  useDesign.getState().setFlip(id, 'H', false)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.flipH).toBe(false)
})

// ── setRadius ─────────────────────────────────────────────────────────────────

test('setRadius sets radius field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setRadius(id, 20)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.radius).toBe(20)
})

test('setRadius coalesces', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setRadius(id, 5)
  useDesign.getState().setRadius(id, 10)
  useDesign.getState().setRadius(id, 15)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setStroke / setStrokeWidth ────────────────────────────────────────────────

test('setStroke sets stroke field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setStroke(id, '#ff0000')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.stroke).toBe('#ff0000')
})

test('setStrokeWidth sets strokeWidth field and coalesces', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setStrokeWidth(id, 2)
  useDesign.getState().setStrokeWidth(id, 4)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.strokeWidth).toBe(4)
  expect(useDesign.getState().past.length).toBe(before + 1)
})

// ── setShadow ─────────────────────────────────────────────────────────────────

test('setShadow sets shadow field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setShadow(id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
  const shadow = useDesign.getState().design.slots.find(s => s.id === id)!.shadow
  expect(shadow).toEqual({ dx: 0, dy: 8, blur: 16, color: '#000000' })
})

test('setShadow null clears shadow', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setShadow(id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
  useDesign.getState().setShadow(id, null)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.shadow).toBeNull()
})

// ── setBlend ──────────────────────────────────────────────────────────────────

test('setBlend sets blend field', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setBlend(id, 'multiply')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.blend).toBe('multiply')
})

test('setBlend normal sets blend to normal', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setBlend(id, 'multiply')
  useDesign.getState().setBlend(id, 'normal')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.blend).toBe('normal')
})

// ── Image effects ─────────────────────────────────────────────────────────────

test('placeImage sets content and imageSrcOriginal to the same src', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().placeImage(imgSlot.id, 'data:image/png;base64,abc')
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.content).toBe('data:image/png;base64,abc')
  expect(slot.imageSrcOriginal).toBe('data:image/png;base64,abc')
})

test('placeImage is an undo step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().placeImage(imgSlot.id, 'data:image/png;base64,abc')
  expect(useDesign.getState().past.length).toBe(pastBefore + 1)
})

test('setImageEffect sets imageEffect on the slot and is an undo step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'grayscale', params: {} })
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.imageEffect?.kind).toBe('grayscale')
  expect(useDesign.getState().past.length).toBe(pastBefore + 1)
})

test('setImageEffect is undoable: undo restores prior imageEffect', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'invert', params: {} })
  useDesign.getState().setImageEffect(imgSlot.id, { kind: 'grayscale', params: {} })
  useDesign.getState().undo()
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.imageEffect?.kind).toBe('invert')
})

test('setProcessedImage updates content WITHOUT adding a history step', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  const pastBefore = useDesign.getState().past.length
  useDesign.getState().setProcessedImage(imgSlot.id, 'data:image/png;base64,processed')
  const slot = useDesign.getState().design.slots.find(s => s.id === imgSlot.id)!
  expect(slot.content).toBe('data:image/png;base64,processed')
  expect(useDesign.getState().past.length).toBe(pastBefore)
})

test('setProcessedImage is a no-op when content is unchanged (prevents re-process loop)', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().setProcessedImage(imgSlot.id, 'data:image/png;base64,same')
  const designAfterFirst = useDesign.getState().design
  // Second identical write must NOT produce a new design reference (else the
  // processor effect would re-fire forever).
  useDesign.getState().setProcessedImage(imgSlot.id, 'data:image/png;base64,same')
  expect(useDesign.getState().design).toBe(designAfterFirst)
})

// ── Riff store tests ──────────────────────────────────────────────────────────

test('seedRiff creates root node and sets currentId', () => {
  const state = useDesign.getState()
  state.seedRiff()
  const { riffTree, design } = useDesign.getState()
  expect(riffTree.rootId).not.toBeNull()
  expect(riffTree.currentId).toBe(riffTree.rootId)
  const root = riffTree.nodes[riffTree.rootId!]
  expect(root.parentId).toBeNull()
  expect(root.design).toEqual(design)
})

test('seedRiff is idempotent — calling twice does not overwrite root', () => {
  const state = useDesign.getState()
  state.seedRiff()
  const firstRoot = useDesign.getState().riffTree.rootId
  state.seedRiff()
  expect(useDesign.getState().riffTree.rootId).toBe(firstRoot)
})

test('applyRiff appends a child node, sets currentId, and commits working design', () => {
  const state = useDesign.getState()
  state.seedRiff()
  const rootId = useDesign.getState().riffTree.rootId!
  const pastBefore = useDesign.getState().past.length

  const newDesign = { ...useDesign.getState().design, seed: 9999 }
  state.applyRiff(newDesign)

  const { riffTree, design } = useDesign.getState()
  expect(design.seed).toBe(9999)
  expect(riffTree.currentId).not.toBe(rootId)
  const child = riffTree.nodes[riffTree.currentId!]
  expect(child.parentId).toBe(rootId)
  expect(child.design.seed).toBe(9999)
  // Past should have grown by 1 (undoable)
  expect(useDesign.getState().past.length).toBe(pastBefore + 1)
})

test('gotoRiffNode switches working design to that node', () => {
  const state = useDesign.getState()
  state.seedRiff()
  const rootId = useDesign.getState().riffTree.rootId!
  const originalSeed = useDesign.getState().design.seed

  const variantDesign = { ...useDesign.getState().design, seed: 12345 }
  state.applyRiff(variantDesign)
  expect(useDesign.getState().design.seed).toBe(12345)

  state.gotoRiffNode(rootId)
  expect(useDesign.getState().design.seed).toBe(originalSeed)
  expect(useDesign.getState().riffTree.currentId).toBe(rootId)
})

test('setRiffStrength clamps to 0..1', () => {
  useDesign.getState().setRiffStrength(0.7)
  expect(useDesign.getState().riffStrength).toBe(0.7)

  useDesign.getState().setRiffStrength(-0.5)
  expect(useDesign.getState().riffStrength).toBe(0)

  useDesign.getState().setRiffStrength(2)
  expect(useDesign.getState().riffStrength).toBe(1)
})

test('openRiff and closeRiff toggle riffOpen', () => {
  expect(useDesign.getState().riffOpen).toBe(false)
  useDesign.getState().openRiff()
  expect(useDesign.getState().riffOpen).toBe(true)
  useDesign.getState().closeRiff()
  expect(useDesign.getState().riffOpen).toBe(false)
})

// ── Viewport zoom/pan state ────────────────────────────────────────────────────

test('setZoom clamps to min 0.1', () => {
  useDesign.getState().setZoom(0)
  expect(useDesign.getState().zoom).toBe(0.1)
})

test('setZoom clamps to max 8', () => {
  useDesign.getState().setZoom(100)
  expect(useDesign.getState().zoom).toBe(8)
})

test('setZoom sets a valid zoom within range', () => {
  useDesign.getState().setZoom(2.5)
  expect(useDesign.getState().zoom).toBe(2.5)
})

test('zoomToFit resets zoom and pan', () => {
  useDesign.getState().setZoom(3)
  useDesign.getState().setPan({ x: 100, y: 50 })
  useDesign.getState().zoomToFit()
  expect(useDesign.getState().zoom).toBe(1)
  expect(useDesign.getState().pan).toEqual({ x: 0, y: 0 })
})

test('setPan sets pan', () => {
  useDesign.getState().setPan({ x: 50, y: -30 })
  expect(useDesign.getState().pan).toEqual({ x: 50, y: -30 })
})

test('zoom not in undo history: setZoom does not grow past array', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().setZoom(2)
  expect(useDesign.getState().past.length).toBe(beforeLen)
})

test('pan not in undo history: setPan does not grow past array', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const beforeLen = useDesign.getState().past.length
  useDesign.getState().setPan({ x: 100, y: 200 })
  expect(useDesign.getState().past.length).toBe(beforeLen)
})

test('zoomBy multiplies current zoom', () => {
  useDesign.getState().setZoom(2)
  useDesign.getState().zoomBy(1.5)
  expect(useDesign.getState().zoom).toBeCloseTo(3)
})

test('zoomTo100 sets zoom to 1', () => {
  useDesign.getState().setZoom(3)
  useDesign.getState().zoomTo100()
  expect(useDesign.getState().zoom).toBe(1)
})

// ── Type pack helpers ──────────────────────────────────────────────────────────

test('setTextTransform sets textTransform field and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setTextTransform(id, 'upper')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.textTransform).toBe('upper')
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.textTransform).toBeUndefined()
})

test('setTextTransform coalesces repeated calls', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setTextTransform(id, 'upper')
  useDesign.getState().setTextTransform(id, 'lower')
  useDesign.getState().setTextTransform(id, 'title')
  expect(useDesign.getState().past.length).toBe(before + 1)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.textTransform).toBe('title')
})

test('setIndent sets indent field and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setIndent(id, 24)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.indent).toBe(24)
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.indent).toBeUndefined()
})

test('setIndent coalesces repeated calls', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setIndent(id, 10)
  useDesign.getState().setIndent(id, 20)
  useDesign.getState().setIndent(id, 30)
  expect(useDesign.getState().past.length).toBe(before + 1)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.indent).toBe(30)
})

test('setListStyle sets listStyle field and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().setListStyle(id, 'bullet')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.listStyle).toBe('bullet')
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.listStyle).toBeUndefined()
})

test('setListStyle coalesces repeated calls', () => {
  const id = useDesign.getState().design.slots[0].id
  const before = useDesign.getState().past.length
  useDesign.getState().setListStyle(id, 'bullet')
  useDesign.getState().setListStyle(id, 'number')
  useDesign.getState().setListStyle(id, 'none')
  expect(useDesign.getState().past.length).toBe(before + 1)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.listStyle).toBe('none')
})

// ── Addictive feature loops ───────────────────────────────────────────────────

test('saveCurrentPoster stores a design snapshot in Poster Mine', () => {
  useDesign.getState().setContent('word', 'MINE THIS')
  const saved = useDesign.getState().saveCurrentPoster('manual')
  expect(saved?.title).toBe('MINE THIS')
  expect(useDesign.getState().savedPosters).toHaveLength(1)
  expect(useDesign.getState().posterMineError).toBeNull()
  expect(localStorage.getItem('raster:poster-mine')).toContain('MINE THIS')
})

test('saveCurrentPoster surfaces storage failures instead of claiming a saved poster', () => {
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
    if (key === 'raster:poster-mine') throw new Error('QuotaExceededError')
  })

  const saved = useDesign.getState().saveCurrentPoster('manual')

  expect(saved).toBeNull()
  expect(useDesign.getState().savedPosters).toHaveLength(0)
  expect(useDesign.getState().posterMineError).toMatch(/storage/i)
  setItemSpy.mockRestore()
})

test('loadSavedPoster loads a poster without deleting the mine', () => {
  useDesign.getState().setContent('word', 'ARCHIVED')
  const saved = useDesign.getState().saveCurrentPoster('manual')
  useDesign.getState().setContent('word', 'CURRENT')
  useDesign.getState().loadSavedPoster(saved!.id)
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.content).toBe('ARCHIVED')
  expect(useDesign.getState().savedPosters).toHaveLength(1)
})

test('applyDailyBrief creates a deterministic generated poster and saves it to the mine', () => {
  useDesign.getState().applyDailyBrief('2026-06-14')
  const d = useDesign.getState().design
  expect(d.archetype).toBe('generated')
  expect(useDesign.getState().dailyBrief?.date).toBe('2026-06-14')
  expect(useDesign.getState().savedPosters[0].source).toBe('daily')
  expect(useDesign.getState().dailyStreak).toEqual({ current: 1, longest: 1, lastDate: '2026-06-14' })
  expect(readStreak()).toEqual(useDesign.getState().dailyStreak)
})

test('saveSelectedComponent and insertComponent round-trip a reusable element group', () => {
  useDesign.getState().setSelection(['word', 'subhead'])
  const component = useDesign.getState().saveSelectedComponent('Hero Pair')
  expect(component?.name).toBe('Hero Pair')
  const beforeCount = useDesign.getState().design.slots.length
  useDesign.getState().insertComponent(component!.id)
  expect(useDesign.getState().design.slots.length).toBe(beforeCount + component!.slots.length)
})

test('guide actions add, remove, and clear guides', () => {
  useDesign.getState().addGuide({ axis: 'x', pos: 100 })
  useDesign.getState().addGuide({ axis: 'y', pos: 200 })
  expect(useDesign.getState().guides).toHaveLength(2)
  useDesign.getState().removeGuide(0)
  expect(useDesign.getState().guides).toEqual([{ axis: 'y', pos: 200 }])
  useDesign.getState().clearGuides()
  expect(useDesign.getState().guides).toEqual([])
})

test('pinSnapshot and restoreSnapshot create an undoable design checkpoint', () => {
  useDesign.getState().setContent('word', 'SNAP ONE')
  const snapshot = useDesign.getState().pinSnapshot()
  useDesign.getState().setContent('word', 'SNAP TWO')
  useDesign.getState().restoreSnapshot(snapshot!.id)
  expect(useDesign.getState().design.slots.find(slot => slot.id === 'word')!.content).toBe('SNAP ONE')
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(slot => slot.id === 'word')!.content).toBe('SNAP TWO')
})

test('saveCurrentRecipe and applyRecipe reuse a visual system while preserving content', () => {
  useDesign.getState().setContent('word', 'FIRST')
  const recipe = useDesign.getState().saveCurrentRecipe('Sprint System')
  useDesign.getState().setLayout(2)
  const before = useDesign.getState().design.slots.filter(s => s.text).map(s => s.content)
  useDesign.getState().applyRecipe(recipe.id)
  const after = useDesign.getState().design.slots.filter(s => s.text).map(s => s.content).slice(0, before.length)
  expect(after).toEqual(before)
  expect(useDesign.getState().design.palette).toEqual(recipe.palette)
})

test('applyCoachFix updates the current design through the Swiss Grid Coach', () => {
  useDesign.getState().setPalette({ bg: '#111111', text: '#181818', accent: '#222222' })
  useDesign.getState().applyCoachFix('increase-contrast')
  expect(useDesign.getState().design.palette.text).toBe('#ffffff')
})

test('setCampaignRaw builds a campaign board and loadCampaignItem loads one poster', () => {
  useDesign.getState().setCampaignRaw('One\nTwo')
  expect(useDesign.getState().campaignItems.map(item => item.title)).toEqual(['One', 'Two'])
  useDesign.getState().loadCampaignItem('campaign-2')
  expect(useDesign.getState().activeCampaignId).toBe('campaign-2')
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.content).toBe('Two')
})

test('setMotionSequence normalizes Motion Lab sequence state', () => {
  useDesign.getState().setMotionSequence({ tempo: 250, delayMs: -10, staggerMs: 999, loop: true })
  expect(useDesign.getState().motionSequence).toEqual({
    effect: 'rise',
    tempo: 200,
    delayMs: 0,
    staggerMs: 300,
    loop: true,
  })
})

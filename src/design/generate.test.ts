import { expect, test } from 'vitest'
import { generate, cellsIntersect } from './generate'
import type { Design, GridCell } from '../types'

const COLS = 12
const ROWS = 16
const VALID_HEX = /^#[0-9a-fA-F]{6}$/

function cellInBounds(cell: GridCell): boolean {
  return (
    cell.c >= 0 && cell.c < COLS &&
    cell.cs >= 1 && cell.c + cell.cs <= COLS &&
    cell.r >= 0 && cell.r < ROWS &&
    cell.rs >= 1 && cell.r + cell.rs <= ROWS
  )
}

function checkDesign(d: Design) {
  // archetype and layout markers
  expect(d.archetype).toBe('generated')
  expect(d.layout).toBe(0)

  // palette is valid hex triple
  expect(d.palette.bg).toMatch(VALID_HEX)
  expect(d.palette.text).toMatch(VALID_HEX)
  expect(d.palette.accent).toMatch(VALID_HEX)

  // every slot cell in bounds
  for (const slot of d.slots) {
    expect(cellInBounds(slot.cell), `slot ${slot.role} cell out of bounds: ${JSON.stringify(slot.cell)}`).toBe(true)
  }

  // at least one title-or-headline text slot
  const hasTitle = d.slots.some(
    s => s.typeClass === 'title' || s.typeClass === 'headline'
  )
  expect(hasTitle).toBe(true)

  // mode is grid
  expect(d.mode).toBe('grid')

  // slots have z
  for (const slot of d.slots) {
    expect(typeof slot.z).toBe('number')
  }
}

// ---------------------------------------------------------------------------
// Basic format tests
// ---------------------------------------------------------------------------

test('generate produces a valid design for 3:4', () => {
  const d = generate('3:4')
  checkDesign(d)
})

test('generate produces a valid design for 4:5', () => {
  const d = generate('4:5')
  checkDesign(d)
})

test('generate produces a valid design for 1:1', () => {
  const d = generate('1:1')
  checkDesign(d)
})

test('generate produces a valid design for 16:9', () => {
  const d = generate('16:9')
  checkDesign(d)
})

// ---------------------------------------------------------------------------
// Core invariant suite — 200 runs
// ---------------------------------------------------------------------------

const TEXT_ROLES = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])

function getTextSlots(d: Design) {
  return d.slots.filter(s => TEXT_ROLES.has(s.role) && s.text)
}

function getImageCells(d: Design): GridCell[] {
  return d.slots.filter(s => s.role === 'image').map(s => s.cell)
}

function countTextOverlaps(d: Design): number {
  const textSlots = d.slots.filter(s => TEXT_ROLES.has(s.role))
  let overlaps = 0
  for (let i = 0; i < textSlots.length; i++) {
    for (let j = i + 1; j < textSlots.length; j++) {
      if (cellsIntersect(textSlots[i].cell, textSlots[j].cell)) overlaps++
    }
  }
  return overlaps
}

/** Check legibility: every text slot is either outside all image regions,
 *  or has a backing block (role: 'block') covering its cell at z < textSlot.z. */
function checkLegibility(d: Design): { pass: boolean; detail: string } {
  const imageCells = getImageCells(d)
  if (imageCells.length === 0) return { pass: true, detail: '' }

  for (const slot of d.slots) {
    if (!TEXT_ROLES.has(slot.role)) continue
    // Check if this text slot overlaps any image cell
    const overlapsImg = imageCells.some(ic => cellsIntersect(slot.cell, ic))
    if (!overlapsImg) continue

    // It overlaps an image — must have a backing scrim block that fully covers it
    const hasScrim = d.slots.some(
      s =>
        s.role === 'block' &&
        s.z !== undefined && slot.z !== undefined &&
        s.z < slot.z &&
        s.cell.c <= slot.cell.c &&
        s.cell.r <= slot.cell.r &&
        s.cell.c + s.cell.cs >= slot.cell.c + slot.cell.cs &&
        s.cell.r + s.cell.rs >= slot.cell.r + slot.cell.rs
    )
    if (!hasScrim) {
      return {
        pass: false,
        detail: `Text slot ${slot.role} at ${JSON.stringify(slot.cell)} overlaps image but has no scrim`,
      }
    }
  }
  return { pass: true, detail: '' }
}

test('200 runs: all slot cells in-bounds', () => {
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      expect(cellInBounds(slot.cell), `run ${i} slot ${slot.role}: ${JSON.stringify(slot.cell)}`).toBe(true)
    }
  }
})

test('200 runs: zero text-on-text overlaps', () => {
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    const overlaps = countTextOverlaps(d)
    expect(overlaps, `run ${i}: ${overlaps} overlap(s) in ${JSON.stringify(d.slots.filter(s => TEXT_ROLES.has(s.role)).map(s => ({ role: s.role, cell: s.cell })))}`).toBe(0)
  }
})

test('200 runs: legibility invariant — text over image has scrim', () => {
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    const { pass, detail } = checkLegibility(d)
    expect(pass, `run ${i}: ${detail}`).toBe(true)
  }
})

test('200 runs: exactly one dominant text element with size ≥ 2× second-largest', () => {
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    const textSizes = getTextSlots(d)
      .map(s => s.text!.size)
      .sort((a, b) => b - a)

    // Need at least 2 text slots to enforce hierarchy; if only 1, hierarchy trivially holds
    if (textSizes.length < 2) {
      expect(textSizes.length).toBeGreaterThanOrEqual(1)
      continue
    }

    const largest = textSizes[0]
    const second = textSizes[1]
    expect(
      largest / second,
      `run ${i}: dominant=${largest} second=${second} ratio=${(largest / second).toFixed(2)}`
    ).toBeGreaterThanOrEqual(2.0)
  }
})

test('200 runs: whitespace ≤ 70% (≤134 distinct non-image occupied cells)', () => {
  const MAX = Math.floor(192 * 0.70) // 134
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    // Count distinct occupied cells from non-image, non-line slots
    // Scrims and text can overlap (same cell) — count as one unique cell
    const nonImageSlots = d.slots.filter(s => s.role !== 'image' && s.role !== 'line')
    const claimedSet = new Set<string>()
    for (const s of nonImageSlots) {
      for (let r = s.cell.r; r < s.cell.r + s.cell.rs; r++) {
        for (let c = s.cell.c; c < s.cell.c + s.cell.cs; c++) {
          claimedSet.add(`${r},${c}`)
        }
      }
    }
    expect(claimedSet.size, `run ${i}: ${claimedSet.size} distinct occupied cells > ${MAX}`).toBeLessThanOrEqual(MAX)
  }
})

test('200 runs: dominant anchor is not centered (≤40% centered across runs)', () => {
  let centeredCount = 0
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    const dominantSlot = d.slots.find(s => s.typeClass === 'title')
    if (!dominantSlot) continue
    const cell = dominantSlot.cell
    // Centered: starts at c:0 with cs>=10 AND row is in the middle band (4-8)
    const hCentered = cell.c <= 2 && cell.cs >= 10
    const vCentered = cell.r >= 4 && cell.r <= 8
    if (hCentered && vCentered) centeredCount++
  }
  // Should be centered in fewer than 40% of runs
  expect(centeredCount / 200).toBeLessThan(0.40)
})

// ---------------------------------------------------------------------------
// Variety tests
// ---------------------------------------------------------------------------

test('50 runs: image treatments vary (not always same treatment)', () => {
  const treatmentFingerprints = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    const imgSlots = d.slots.filter(s => s.role === 'image')
    const key = imgSlots.length === 0 ? 'none' : `${imgSlots[0].cell.cs}x${imgSlots[0].cell.rs}@${imgSlots[0].cell.c},${imgSlots[0].cell.r}`
    treatmentFingerprints.add(key)
  }
  // With 7 treatments and random parameters, expect >5 distinct shapes
  expect(treatmentFingerprints.size).toBeGreaterThan(5)
})

test('50 runs: dominant anchor varies (not all in same position)', () => {
  const anchors = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    const dom = d.slots.find(s => s.typeClass === 'title')
    if (dom) anchors.add(`${dom.cell.c},${dom.cell.r}`)
  }
  expect(anchors.size).toBeGreaterThan(4)
})

test('50 runs: content phrases vary (low duplicate rate)', () => {
  const contentSets = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    contentSets.add(d.slots.map(s => s.content).join('|'))
  }
  // Very few duplicates expected from expanded pool
  expect(contentSets.size).toBeGreaterThan(40)
})

test('50 runs: palettes vary', () => {
  const paletteSets = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    paletteSets.add(JSON.stringify(d.palette))
  }
  expect(paletteSets.size).toBeGreaterThan(2)
})

// ---------------------------------------------------------------------------
// Existing specific tests (kept)
// ---------------------------------------------------------------------------

test('50 runs: all in-bounds, title/headline present, valid palette, no crash', () => {
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    checkDesign(d)
  }
})

test('line slots stay in bounds across runs', () => {
  let lineCount = 0
  for (let i = 0; i < 100; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      if (slot.role === 'line') {
        lineCount++
        expect(cellInBounds(slot.cell)).toBe(true)
      }
    }
  }
  // Lines are optional but should appear sometimes (accent h-rule/v-rule)
  expect(lineCount).toBeGreaterThan(0)
})

test('block slots in bounds', () => {
  for (let i = 0; i < 100; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      if (slot.role === 'block') {
        expect(cellInBounds(slot.cell)).toBe(true)
      }
    }
  }
})

test('image slots have empty content string', () => {
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      if (slot.role === 'image') {
        expect(slot.content).toBe('')
      }
    }
  }
})

test('generate returns fresh seed each call', () => {
  const seeds = new Set<number>()
  for (let i = 0; i < 10; i++) {
    seeds.add(generate('3:4').seed)
  }
  expect(seeds.size).toBeGreaterThan(5)
})

// ---------------------------------------------------------------------------
// cellsIntersect unit tests (kept)
// ---------------------------------------------------------------------------

test('cellsIntersect: overlapping cells return true', () => {
  const a: GridCell = { c: 0, cs: 4, r: 0, rs: 4 }
  const b: GridCell = { c: 2, cs: 4, r: 2, rs: 4 }
  expect(cellsIntersect(a, b)).toBe(true)
})

test('cellsIntersect: adjacent (touching) cells return false', () => {
  const a: GridCell = { c: 0, cs: 4, r: 0, rs: 4 }
  const b: GridCell = { c: 4, cs: 4, r: 0, rs: 4 }
  expect(cellsIntersect(a, b)).toBe(false)
})

test('cellsIntersect: non-overlapping cells return false', () => {
  const a: GridCell = { c: 0, cs: 3, r: 0, rs: 3 }
  const b: GridCell = { c: 6, cs: 3, r: 6, rs: 3 }
  expect(cellsIntersect(a, b)).toBe(false)
})

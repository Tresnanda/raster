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

  // every slot cell in bounds (box-only slots have cell {c:0,cs:12,r:0,rs:1} which is also fine)
  for (const slot of d.slots) {
    expect(cellInBounds(slot.cell)).toBe(true)
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

test('50 runs: all in-bounds, title/headline present, valid palette, no crash', () => {
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    checkDesign(d)
  }
})

test('strategies vary: 30 runs produce different outcomes', () => {
  const contentSets = new Set<string>()
  const paletteSets = new Set<string>()
  for (let i = 0; i < 30; i++) {
    const d = generate('3:4')
    // Content of all slots joined as fingerprint
    contentSets.add(d.slots.map(s => s.content).join('|'))
    paletteSets.add(JSON.stringify(d.palette))
  }
  // With 5 strategies and random parameterization, should see many distinct compositions
  expect(contentSets.size).toBeGreaterThan(5)
})

test('line slots stay in bounds across runs', () => {
  let lineCount = 0
  for (let i = 0; i < 50; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      if (slot.role === 'line') {
        lineCount++
        expect(cellInBounds(slot.cell)).toBe(true)
      }
    }
  }
  // Lines are optional but should appear sometimes (numeral + diptych strategies)
  expect(lineCount).toBeGreaterThan(0)
})

test('block slots in bounds', () => {
  for (let i = 0; i < 30; i++) {
    const d = generate('3:4')
    for (const slot of d.slots) {
      if (slot.role === 'block') {
        expect(cellInBounds(slot.cell)).toBe(true)
      }
    }
  }
})

test('image slots have empty content string', () => {
  for (let i = 0; i < 20; i++) {
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
// Fix #2 — zero text-on-text overlaps over 100 runs
// ---------------------------------------------------------------------------

const TEXT_ROLES = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])

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

test('100 runs: zero text-on-text overlaps (collision guard)', () => {
  for (let i = 0; i < 100; i++) {
    const d = generate('3:4')
    const overlaps = countTextOverlaps(d)
    expect(overlaps, `run ${i}: found ${overlaps} text-on-text overlap(s) in slots: ${JSON.stringify(d.slots.filter(s => TEXT_ROLES.has(s.role)).map(s => ({ role: s.role, cell: s.cell })))}`).toBe(0)
  }
})

// ---------------------------------------------------------------------------
// Fix #3 — dominant text hierarchy: largest text size >= 2x the next size
// ---------------------------------------------------------------------------

test('100 runs: generated poster has a clearly dominant text size (≥2×)', () => {
  for (let i = 0; i < 100; i++) {
    const d = generate('3:4')
    const textSizes = d.slots
      .filter(s => s.text && (s.typeClass === 'title' || s.typeClass === 'headline'))
      .map(s => s.text!.size)
      .sort((a, b) => b - a)

    // Need at least one title/headline slot
    if (textSizes.length < 2) continue

    const largest = textSizes[0]
    const second = textSizes[1]
    // The dominant element must be at least 2× the next text size
    expect(
      largest / second,
      `run ${i}: dominant=${largest} second=${second} ratio=${(largest / second).toFixed(2)} — no clear hierarchy`
    ).toBeGreaterThanOrEqual(2.0)
  }
})

// ---------------------------------------------------------------------------
// cellsIntersect unit tests
// ---------------------------------------------------------------------------

test('cellsIntersect: overlapping cells return true', () => {
  const a: GridCell = { c: 0, cs: 4, r: 0, rs: 4 }
  const b: GridCell = { c: 2, cs: 4, r: 2, rs: 4 }
  expect(cellsIntersect(a, b)).toBe(true)
})

test('cellsIntersect: adjacent (touching) cells return false', () => {
  const a: GridCell = { c: 0, cs: 4, r: 0, rs: 4 }
  const b: GridCell = { c: 4, cs: 4, r: 0, rs: 4 } // starts exactly where a ends
  expect(cellsIntersect(a, b)).toBe(false)
})

test('cellsIntersect: non-overlapping cells return false', () => {
  const a: GridCell = { c: 0, cs: 3, r: 0, rs: 3 }
  const b: GridCell = { c: 6, cs: 3, r: 6, rs: 3 }
  expect(cellsIntersect(a, b)).toBe(false)
})

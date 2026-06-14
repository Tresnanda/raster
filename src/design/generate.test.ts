import { expect, test } from 'vitest'
import { generate, cellsIntersect } from './generate'
import type { Design, GridCell } from '../types'

const COLS = 12
const ROWS = 16
const VALID_HEX = /^#[0-9a-fA-F]{6}$/
const SWISS_GRAMMARS = new Set([
  'split-field',
  'asymmetric-headline',
  'modular-catalog',
  'typographic-monument',
  'image-diptych',
  'index-rail',
  'occlusion-bar',
])

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

function designFingerprint(d: Design): string {
  return JSON.stringify({
    palette: d.palette,
    style: d.style,
    typography: d.typography,
    generation: d.generation,
    slots: d.slots.map(s => ({
      role: s.role,
      cell: s.cell,
      content: s.content,
      text: s.text,
      fill: s.fill,
      typeClass: s.typeClass,
      z: s.z,
    })),
  })
}

/** Legibility / "text respects the image" invariant:
 *  - A FULL-BLEED image (cell covers the whole 12×16 grid) is the intentional
 *    type-over-photo style — text MAY sit on it.
 *  - Any OTHER image (framed / half / band) must have NO text on top of it:
 *    supporting text and the dominant are placed in the clean zones around it.
 *  (Scrim backing blocks were removed — real photos carry their own contrast.) */
function checkLegibility(d: Design): { pass: boolean; detail: string } {
  const imageCells = getImageCells(d)
  if (imageCells.length === 0) return { pass: true, detail: '' }

  const isFullBleed = (c: { c: number; cs: number; r: number; rs: number }) =>
    c.c === 0 && c.cs === 12 && c.r === 0 && c.rs === 16
  // If there's a full-bleed image, text-on-image is allowed for this design.
  if (imageCells.some(isFullBleed)) return { pass: true, detail: '' }

  const framedImages = imageCells.filter(ic => !isFullBleed(ic))
  for (const slot of d.slots) {
    if (!TEXT_ROLES.has(slot.role)) continue
    const overlapsImg = framedImages.some(ic => cellsIntersect(slot.cell, ic))
    if (overlapsImg) {
      return {
        pass: false,
        detail: `Text slot ${slot.role} at ${JSON.stringify(slot.cell)} overlaps a non-full-bleed image`,
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

test('200 runs: legibility — non-full-bleed images never have text on them', () => {
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

test('generate is reproducible when given an explicit seed', () => {
  const a = generate('4:5', { seed: 123456, candidateCount: 12 })
  const b = generate('4:5', { seed: 123456, candidateCount: 12 })
  const c = generate('4:5', { seed: 654321, candidateCount: 12 })

  expect(a.seed).toBe(123456)
  expect(b.seed).toBe(123456)
  expect(designFingerprint(a)).toBe(designFingerprint(b))
  expect(designFingerprint(a)).not.toBe(designFingerprint(c))
})

test('generate records a scored Swiss grammar candidate', () => {
  const d = generate('3:4', { seed: 314159, candidateCount: 16 })

  expect(d.generation?.grammar).toBeDefined()
  expect(SWISS_GRAMMARS.has(d.generation!.grammar)).toBe(true)
  expect(d.generation?.candidateCount).toBeGreaterThanOrEqual(12)
  expect(d.generation?.score).toBeGreaterThanOrEqual(78)
  expect(d.generation?.readability.textOverlapCount).toBe(0)
  expect(d.generation?.readability.nonFullBleedTextImageOverlaps).toBe(0)
  expect(d.generation?.readability.titleCount).toBe(1)
  expect(d.generation?.readability.supportingTextCount).toBeGreaterThanOrEqual(1)
})

test('80 seeded runs: Surprise uses several explicit Swiss grammars', () => {
  const grammars = new Set<string>()
  for (let i = 0; i < 80; i++) {
    grammars.add(generate('3:4', { seed: 5000 + i, candidateCount: 10 }).generation!.grammar)
  }

  expect(grammars.size).toBeGreaterThanOrEqual(4)
})

test('120 seeded runs: Surprise does not collapse into one visible structure recipe', () => {
  const sample = Array.from({ length: 120 }, (_, i) =>
    generate('4:5', { seed: 20000 + i, candidateCount: 18 })
  )
  const recipeCounts = new Map<string, number>()

  for (const design of sample) {
    const imageCount = design.slots.filter(s => s.role === 'image').length
    const textCount = design.slots.filter(s => s.text).length
    const supportingTextCount = design.generation?.readability.supportingTextCount ?? 0
    const accentCount = design.slots.filter(s => s.role === 'line' || s.role === 'block').length
    const recipe = `img${imageCount}/text${textCount}/support${supportingTextCount}/accent${accentCount}/slots${design.slots.length}`
    recipeCounts.set(recipe, (recipeCounts.get(recipe) ?? 0) + 1)
  }

  const mostCommonRecipeCount = Math.max(...recipeCounts.values())
  const accentFreeCount = sample.filter(d =>
    d.slots.every(s => s.role !== 'line' && s.role !== 'block')
  ).length
  const imageFreeCount = sample.filter(d =>
    d.slots.every(s => s.role !== 'image')
  ).length
  const denseCount = sample.filter(d =>
    (d.generation?.readability.supportingTextCount ?? 0) >= 3
  ).length

  expect(mostCommonRecipeCount).toBeLessThanOrEqual(42)
  expect(accentFreeCount).toBeGreaterThanOrEqual(20)
  expect(imageFreeCount).toBeGreaterThanOrEqual(20)
  expect(denseCount).toBeGreaterThanOrEqual(18)
})

test('generate records the creative brief used to select candidates', () => {
  const d = generate('4:5', { seed: 6142026, candidateCount: 12 })

  expect(d.generation?.brief).toEqual({
    density: expect.stringMatching(/^(quiet|balanced|dense)$/),
    imageMode: expect.stringMatching(/^(none|optional|required)$/),
    accentMode: expect.stringMatching(/^(none|optional|required)$/),
  })
})

test('occlusion-bar grammar creates one controlled readable title occlusion', () => {
  const d = generate('4:5', {
    seed: 240614,
    candidateCount: 16,
    grammar: 'occlusion-bar',
  })
  const generation = d.generation
  const occlusion = d.slots.find(s => s.name === 'controlled-occlusion')
  const title = d.slots.find(s => s.typeClass === 'title' && s.text)

  expect(generation?.grammar).toBe('occlusion-bar')
  expect(generation?.expressiveMove).toBe('controlled-occlusion')
  expect(generation?.readability.expressiveMoveCount).toBeLessThanOrEqual(1)
  expect(generation?.readability.occludedTitleFraction).toBeGreaterThan(0)
  expect(generation?.readability.occludedTitleFraction).toBeLessThanOrEqual(0.35)
  expect(occlusion).toBeDefined()
  expect(title).toBeDefined()
  expect(cellsIntersect(occlusion!.cell, title!.cell)).toBe(true)
  expect((occlusion!.z ?? 0)).toBeGreaterThan(title!.z ?? 0)
})

test('80 seeded runs: expressive rule breaks are singular and readable', () => {
  for (let i = 0; i < 80; i++) {
    const d = generate('3:4', { seed: 9000 + i, candidateCount: 12 })
    const generation = d.generation
    expect(generation?.readability.expressiveMoveCount).toBeLessThanOrEqual(1)
    expect(generation?.readability.occludedTitleFraction).toBeLessThanOrEqual(0.35)
  }
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

test('200 runs: the dominant headline is never a single character', () => {
  for (let i = 0; i < 200; i++) {
    const d = generate('3:4')
    const titles = d.slots.filter(s => s.typeClass === 'title' && s.text)
    for (const t of titles) {
      expect(t.content.trim().length, `run ${i}: dominant "${t.content}" too short`).toBeGreaterThan(1)
    }
  }
})

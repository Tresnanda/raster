import type { Design, Format, GridCell, Slot, TextStyle } from '../types'
import { defaultGrid } from './formats'
import { PRESET_PALETTES } from './palettes'
import { DEFAULT_TYPOGRAPHY } from './typeclass'

// ---------------------------------------------------------------------------
// Editorial content pools (expanded for variety)
// ---------------------------------------------------------------------------
const HEADLINES = [
  'RUN', 'MAIN STAGE', 'NOW', 'FORM', 'FIELD', 'BLOC', 'OPEN',
  'SIGNAL', 'DRIFT', 'ZERO', 'EDGE', 'PULSE', 'GRID', 'LOOP',
  'FRAME', 'AXIS', 'VOID', 'MARK', 'LINE', 'BASE', 'FLUX',
  'MASS', 'CORE', 'NODE', 'ZONE', 'DEPTH', 'PITCH', 'SPAN',
  'ECHO', 'FOLD',
]
const SUBHEADS = [
  'Chasing Horizons', 'In Full Motion', 'At The Limit',
  'New Perspectives', 'Against The Grain', 'Between Lines',
  'Surface Tension', 'High Contrast', 'No Compromise',
  'Open Field', 'Late Light', 'Hard Edge', 'Still Moving',
  'Long Exposure', 'Raw Material', 'Soft Focus', 'Deep Cut',
  'Close Reading', 'Wide Angle', 'Slow Burn',
]
const KICKERS = [
  'A Berlin Story', 'Field Season', 'Late Light Edition', 'Studio Notes',
  'After Hours', 'On Location', 'Special Report', 'The Long View',
  'Close Range', 'Open Session', 'From The Archive', 'Night Edition',
  'The Early Work', 'Summer Issue', 'Winter Annual', 'Press Preview',
  'Edition Zero', 'Series Three', 'The Monograph', 'Platform Edition',
]
const DATES = [
  '15–26 June', '08–19 July', '01–12 Aug', '03–14 Sept', '20–31 Oct',
  '10–21 Nov', '02–13 Dec', '05–16 Jan', '14–25 Feb', '07–18 Mar',
  '22 Apr – 04 May', '28 Jun – 09 Jul', '17–28 Aug', '04–15 Sept',
  '19–30 Oct', '06–17 Nov', '12 Dec – 02 Jan', '09–20 Feb',
  '18–29 Mar', '24 Apr – 05 May',
]
const VOLUMES = [
  'Vol. 01', 'Vol. 02', 'Vol. 03', 'Vol. 04', 'Vol. 05',
  'Issue 12', 'Issue 07', 'Issue 03', 'Issue 18', 'Issue 24',
  'No. 001', 'No. 007', 'No. 012', 'No. 033', 'No. 048',
  'Ed. 01', 'Ed. 04', 'Ed. 09', 'Ed. 14', 'Annual 2026',
]
const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2019', '2020', '2021', '2022']
const CITIES = [
  'Berlin', 'Tokyo', 'Lagos', 'London', 'Seoul', 'Melbourne', 'Lisbon', 'New York',
  'Milan', 'Shanghai', 'Nairobi', 'São Paulo', 'Oslo', 'Copenhagen', 'Vienna',
  'Mexico City', 'Amsterdam', 'Taipei', 'Johannesburg', 'Buenos Aires',
]
const FOOTERS = [
  'raster.studio', 'studio & co.', 'form works', 'index press',
  'field office', 'base studio', 'signal press', 'grid works',
  'loop studio', 'edge press', 'frame studio', 'bloc press',
  'mark & co.', 'axis studio', 'core press',
]
const NUMERALS = [
  '01', '02', '07', '12', '24', '36', '48', '99',
  '03', '05', '09', '14', '17', '22', '28', '33',
]
const INDEX_LINES = [
  'Opening  ——  p.01',
  'Field Notes  ——  p.12',
  'Long Read  ——  p.24',
  'Portfolio  ——  p.36',
  'Archive  ——  p.48',
  'Editorial  ——  p.06',
  'Interview  ——  p.18',
  'Review  ——  p.30',
  'Profile  ——  p.42',
  'Afterword  ——  p.54',
]
const CAPTIONS = [
  'Photographed on location', 'All images © the studio', 'Printed on demand',
  'Limited to 500 copies', 'First edition, 2026', 'Distributed worldwide',
  'Shot on medium format', 'Archival pigment print', 'Open edition',
  'Numbered and signed', 'Studio production', 'Field documentation',
  'Season collection', 'Annual publication', 'Collector edition',
]

// ---------------------------------------------------------------------------
// Seeded-ish helpers (we use Math.random, called once per generate call)
// ---------------------------------------------------------------------------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function maybe(prob: number): boolean {
  return Math.random() < prob
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ---------------------------------------------------------------------------
// Slot id counter (simple sequential, reset per call via closure)
// ---------------------------------------------------------------------------
function makeIdGen() {
  let n = 0
  return () => `gen-${Date.now()}-${n++}`
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------
const COLS = 12
const ROWS = 16

function clampCell(c: GridCell): GridCell {
  const cs = Math.max(1, Math.min(c.cs, COLS - c.c))
  const rs = Math.max(1, Math.min(c.rs, ROWS - c.r))
  return {
    c: Math.max(0, Math.min(c.c, COLS - 1)),
    cs,
    r: Math.max(0, Math.min(c.r, ROWS - 1)),
    rs,
  }
}

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------

/** Returns true when cell a and cell b overlap (share at least one grid unit). */
function cellsIntersect(a: GridCell, b: GridCell): boolean {
  const aR = a.r + a.rs   // exclusive bottom
  const bR = b.r + b.rs
  const aC = a.c + a.cs   // exclusive right
  const bC = b.c + b.cs
  return a.r < bR && aR > b.r && a.c < bC && aC > b.c
}

/**
 * Resolve text-on-text overlaps.  Image / block / line slots may sit below
 * text — that's intentional.  Only TEXT roles are checked.
 *
 * Strategy:
 *  1. Walk slots in order; if a text slot overlaps an already-kept text slot,
 *     try to shift it to the nearest free corner row/col that is in-bounds and
 *     non-colliding with all kept text slots.
 *  2. If no such position is found, shrink rs to 1 and try again; if still
 *     colliding, drop the slot.
 */
function resolveTextCollisions(slots: Slot[], cols: number, rows: number): Slot[] {
  const TEXT_ROLES = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])
  const kept: Slot[] = []

  for (const slot of slots) {
    if (!TEXT_ROLES.has(slot.role)) {
      // non-text: always keep, don't participate in collision resolution
      kept.push(slot)
      continue
    }

    const keptText = kept.filter(s => TEXT_ROLES.has(s.role))
    const collides = (cell: GridCell) => keptText.some(k => cellsIntersect(k.cell, cell))

    if (!collides(slot.cell)) {
      kept.push(slot)
      continue
    }

    // Try candidate positions: corners + near-original shifted cells
    const { cs, rs } = slot.cell
    const candidateRows = [0, 1, 2, rows - 2, rows - 1, rows - rs]
    const candidateCols = [0, cols - cs, Math.floor((cols - cs) / 2)]
    const candidates: GridCell[] = []
    for (const r of candidateRows) {
      for (const c of candidateCols) {
        const cell = clampCell({ c, cs, r, rs })
        candidates.push(cell)
      }
    }

    let resolved: GridCell | null = null
    for (const cell of candidates) {
      if (!collides(cell)) {
        resolved = cell
        break
      }
    }

    if (!resolved) {
      // Try shrinking to rs:1
      const thinCell = clampCell({ c: slot.cell.c, cs, r: slot.cell.r, rs: 1 })
      if (!collides(thinCell)) {
        resolved = thinCell
      }
    }

    if (resolved) {
      kept.push({ ...slot, cell: resolved })
    }
    // else: drop the slot (no valid non-colliding position found)
  }

  return kept
}

// ---------------------------------------------------------------------------
// Default text styles by role class
// ---------------------------------------------------------------------------
function titleText(size: number, align: 'left' | 'center' | 'right' = 'left'): TextStyle {
  return { family: 'display', weight: 800, size, tracking: -0.03, leading: 0.88, align, fit: 'auto' }
}

function headlineText(size: number, align: 'left' | 'center' | 'right' = 'left'): TextStyle {
  return { family: 'display', weight: 700, size, tracking: -0.02, leading: 0.9, align, fit: 'fixed' }
}

function bodyText(size: number = 18, align: 'left' | 'center' | 'right' = 'left'): TextStyle {
  return { family: 'sans', weight: 500, size, tracking: 0, leading: 1.2, align, fit: 'fixed' }
}

function captionText(size: number = 18, align: 'left' | 'center' | 'right' = 'left'): TextStyle {
  return { family: 'sans', weight: 600, size, tracking: 0.04, leading: 1.15, align, fit: 'fixed' }
}

// ---------------------------------------------------------------------------
// Occupancy grid — tracks which cells are already claimed
// ---------------------------------------------------------------------------

class OccupancyGrid {
  private grid: boolean[][]
  readonly cols: number
  readonly rows: number

  constructor(cols: number, rows: number) {
    this.cols = cols
    this.rows = rows
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(false))
  }

  claim(cell: GridCell): void {
    const rEnd = Math.min(cell.r + cell.rs, this.rows)
    const cEnd = Math.min(cell.c + cell.cs, this.cols)
    for (let r = Math.max(0, cell.r); r < rEnd; r++) {
      for (let c = Math.max(0, cell.c); c < cEnd; c++) {
        this.grid[r][c] = true
      }
    }
  }

  isFree(cell: GridCell): boolean {
    const rEnd = Math.min(cell.r + cell.rs, this.rows)
    const cEnd = Math.min(cell.c + cell.cs, this.cols)
    for (let r = Math.max(0, cell.r); r < rEnd; r++) {
      for (let c = Math.max(0, cell.c); c < cEnd; c++) {
        if (this.grid[r][c]) return false
      }
    }
    return true
  }

  occupiedCount(): number {
    return this.grid.reduce((sum, row) => sum + row.filter(Boolean).length, 0)
  }
}

// Tracks which cells contain image pixels — used for scrim decisions
class ImageRegionSet {
  private grid: boolean[][]
  readonly cols: number
  readonly rows: number

  constructor(cols: number, rows: number) {
    this.cols = cols
    this.rows = rows
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(false))
  }

  mark(cell: GridCell): void {
    const rEnd = Math.min(cell.r + cell.rs, this.rows)
    const cEnd = Math.min(cell.c + cell.cs, this.cols)
    for (let r = Math.max(0, cell.r); r < rEnd; r++) {
      for (let c = Math.max(0, cell.c); c < cEnd; c++) {
        this.grid[r][c] = true
      }
    }
  }

  /** Returns true if ANY cell in `cell` overlaps an image region. */
  overlapsImage(cell: GridCell): boolean {
    const rEnd = Math.min(cell.r + cell.rs, this.rows)
    const cEnd = Math.min(cell.c + cell.cs, this.cols)
    for (let r = Math.max(0, cell.r); r < rEnd; r++) {
      for (let c = Math.max(0, cell.c); c < cEnd; c++) {
        if (this.grid[r][c]) return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Skeleton decision space — the "infinite" dimension
// ---------------------------------------------------------------------------

type ImageTreatment = 'none' | 'full-bleed' | 'framed-block' | 'half-split-left' | 'half-split-right' | 'h-band' | 'v-band'
type DominantType = 'mega-word' | 'headline-stack' | 'giant-numeral' | 'oversized-glyph'
type DominantAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left-band' | 'right-band' | 'top-band' | 'bottom-band' | 'mid-left' | 'mid-right'
type AccentType = 'none' | 'h-rule' | 'v-rule' | 'accent-block'
type ClusterKind = 'meta' | 'caption' | 'index' | 'date' | 'kicker' | 'footer-mark'

interface Skeleton {
  imageTreatment: ImageTreatment
  dominantType: DominantType
  dominantAnchor: DominantAnchor
  dominantSize: number
  clusterCount: number
  clusterKinds: ClusterKind[]
  accentType: AccentType
}

const IMAGE_TREATMENTS: ImageTreatment[] = ['none', 'full-bleed', 'framed-block', 'half-split-left', 'half-split-right', 'h-band', 'v-band']
const DOMINANT_TYPES: DominantType[] = ['mega-word', 'headline-stack', 'giant-numeral', 'oversized-glyph']
// Anchors exclude pure center — Swiss grid prefers edge tension
const DOMINANT_ANCHORS: DominantAnchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left-band', 'right-band', 'top-band', 'bottom-band', 'mid-left', 'mid-right']
const CLUSTER_KINDS: ClusterKind[] = ['meta', 'caption', 'index', 'date', 'kicker', 'footer-mark']

function chooseSkeleton(): Skeleton {
  const dominantType = pick(DOMINANT_TYPES)
  // Size range varies by type
  const dominantSize = dominantType === 'mega-word' || dominantType === 'oversized-glyph'
    ? randInt(240, 380)
    : dominantType === 'giant-numeral'
      ? randInt(280, 400)
      : randInt(120, 220) // headline-stack

  const clusterCount = randInt(0, 4)
  // Pick unique cluster kinds
  const shuffled = [...CLUSTER_KINDS].sort(() => Math.random() - 0.5)
  const clusterKinds = shuffled.slice(0, clusterCount) as ClusterKind[]

  return {
    imageTreatment: pick(IMAGE_TREATMENTS),
    dominantType,
    dominantAnchor: pick(DOMINANT_ANCHORS),
    dominantSize,
    clusterCount,
    clusterKinds,
    accentType: pick(['none', 'none', 'h-rule', 'v-rule', 'accent-block'] as AccentType[]), // bias toward none
  }
}

// ---------------------------------------------------------------------------
// Image placement — maps ImageTreatment to a concrete GridCell
// ---------------------------------------------------------------------------

/** Map an ImageTreatment to a concrete GridCell (clamped, valid). */
function resolveImageCell(treatment: ImageTreatment): GridCell | null {
  switch (treatment) {
    case 'none': return null
    case 'full-bleed':
      return clampCell({ c: 0, cs: COLS, r: 0, rs: ROWS })
    case 'framed-block': {
      const cs = randInt(5, 10)
      const rs = randInt(7, 12)
      const c = randInt(0, COLS - cs)
      const r = randInt(1, ROWS - rs - 1)
      return clampCell({ c, cs, r, rs })
    }
    case 'half-split-left': {
      const cs = randInt(5, 7)
      return clampCell({ c: 0, cs, r: 0, rs: ROWS })
    }
    case 'half-split-right': {
      const cs = randInt(5, 7)
      return clampCell({ c: COLS - cs, cs, r: 0, rs: ROWS })
    }
    case 'h-band': {
      const rs = randInt(4, 8)
      const r = randInt(2, ROWS - rs - 2)
      return clampCell({ c: 0, cs: COLS, r, rs })
    }
    case 'v-band': {
      const cs = randInt(2, 4)
      const c = randInt(2, COLS - cs - 2)
      return clampCell({ c, cs, r: 0, rs: ROWS })
    }
  }
}

/** Place image slot, mark image region. Returns null for 'none'. */
function placeImage(
  treatment: ImageTreatment,
  occ: OccupancyGrid,
  imgRegions: ImageRegionSet,
  id: () => string,
): Slot | null {
  const cell = resolveImageCell(treatment)
  if (!cell) return null
  // Images go at z:1 — always behind text
  const slot: Slot = { id: id(), role: 'image', z: 1, cell, content: '' }
  // Don't claim occupancy for images — text can intentionally overlap (with scrim)
  // But DO mark image regions so scrim logic knows where images are
  void occ
  imgRegions.mark(cell)
  return slot
}

// ---------------------------------------------------------------------------
// Dominant text placement
// ---------------------------------------------------------------------------

/** Map a DominantAnchor to a concrete cell for the dominant element.
 *  Biases toward edges and corners — never the exact center. */
function resolveDominantCell(anchor: DominantAnchor, dominantType: DominantType): GridCell {
  // Row/col spans vary by type:
  //   mega-word / oversized-glyph: wide & tall
  //   giant-numeral: wide & medium
  //   headline-stack: medium width, taller
  const cs = dominantType === 'headline-stack' ? randInt(6, 10) : randInt(8, 12)
  const rs = dominantType === 'headline-stack' ? randInt(4, 7) : randInt(3, 5)

  switch (anchor) {
    case 'top-left':    return clampCell({ c: 0, cs, r: 0, rs })
    case 'top-right':   return clampCell({ c: COLS - cs, cs, r: 0, rs })
    case 'bottom-left': return clampCell({ c: 0, cs, r: ROWS - rs, rs })
    case 'bottom-right':return clampCell({ c: COLS - cs, cs, r: ROWS - rs, rs })
    case 'left-band':   return clampCell({ c: 0, cs, r: randInt(2, ROWS - rs - 2), rs })
    case 'right-band':  return clampCell({ c: COLS - cs, cs, r: randInt(2, ROWS - rs - 2), rs })
    case 'top-band':    return clampCell({ c: randInt(0, COLS - cs), cs, r: 0, rs })
    case 'bottom-band': return clampCell({ c: randInt(0, COLS - cs), cs, r: ROWS - rs, rs })
    case 'mid-left':    return clampCell({ c: 0, cs, r: randInt(4, 9), rs })
    case 'mid-right':   return clampCell({ c: COLS - cs, cs, r: randInt(4, 9), rs })
  }
}

/** Determine text alignment from anchor position. */
function anchorAlign(anchor: DominantAnchor): 'left' | 'right' {
  if (anchor === 'top-right' || anchor === 'bottom-right' || anchor === 'right-band' || anchor === 'mid-right') {
    return 'right'
  }
  return 'left'
}

/** Create a scrim block slot behind a text cell. z is textZ - 1. */
function makeScrim(textCell: GridCell, textZ: number, bgColor: string, id: () => string): Slot {
  return {
    id: id(),
    role: 'block',
    z: textZ - 1,
    cell: { ...textCell },
    content: '',
    fill: bgColor,
    opacity: 0.88,
  }
}

/** Place the dominant text element. Returns [dominantSlot, ...scrimSlots]. */
function placeDominant(
  skeleton: Skeleton,
  occ: OccupancyGrid,
  imgRegions: ImageRegionSet,
  bgColor: string,
  id: () => string,
): Slot[] {
  const cell = resolveDominantCell(skeleton.dominantAnchor, skeleton.dominantType)
  const z = 5 // dominant is always in front of everything else
  const align = anchorAlign(skeleton.dominantAnchor)

  let slot: Slot
  switch (skeleton.dominantType) {
    case 'mega-word':
      slot = {
        id: id(), role: 'headline', z,
        cell,
        content: pick(HEADLINES),
        text: titleText(skeleton.dominantSize, align),
        typeClass: 'title',
      }
      break
    case 'headline-stack':
      slot = {
        id: id(), role: 'headline', z,
        cell,
        content: pick(HEADLINES),
        text: headlineText(skeleton.dominantSize, align),
        typeClass: 'title',
      }
      break
    case 'giant-numeral':
      slot = {
        id: id(), role: 'date', z,
        cell,
        content: maybe(0.6) ? pick(YEARS) : pick(NUMERALS),
        text: headlineText(skeleton.dominantSize, align),
        typeClass: 'title',
      }
      break
    case 'oversized-glyph':
      slot = {
        id: id(), role: 'glyph', z,
        cell,
        content: pick(HEADLINES).slice(0, 1), // single letter
        text: titleText(skeleton.dominantSize, align),
        typeClass: 'title',
      }
      break
  }

  // Claim occupancy with the dominant element
  occ.claim(cell)

  const result: Slot[] = [slot!]

  // Legibility: if dominant overlaps image region, add a scrim behind it
  if (imgRegions.overlapsImage(cell)) {
    result.unshift(makeScrim(cell, z, bgColor, id))
  }

  return result
}

// ---------------------------------------------------------------------------
// Strategy 1: big-word
// Huge headline spanning most width at a random vertical band; optional
// full-bleed image; 1–2 small caption clusters in corners; optional mark.
//
// FIX #1 (big-word): when a mark is emitted at r:ROWS-1, the bottom-left
// caption corner would collide with it (r:ROWS-2, rs:2 bleeds into ROWS-1).
// We either: (a) exclude the bottom-left corner when a mark will be placed,
// or (b) keep the caption at rs:1 only.  We choose (a) to preserve variety.
// ---------------------------------------------------------------------------
function bigWord(id: () => string): Slot[] {
  const slots: Slot[] = []

  // Headline row band — pick a random row in the middle half
  const headlineRow = randInt(4, 10)
  const headlineRowSpan = randInt(3, 5)
  const headlineCols = randInt(10, 12)
  const headlineColStart = Math.floor((COLS - headlineCols) / 2)
  const titleSize = randInt(240, 340)
  const align = maybe(0.5) ? 'center' : 'left'

  slots.push({
    id: id(), role: 'headline', z: 3,
    cell: clampCell({ c: headlineColStart, cs: headlineCols, r: headlineRow, rs: headlineRowSpan }),
    content: pick(HEADLINES),
    text: titleText(titleSize, align),
    typeClass: 'title',
  })

  // Optional full-bleed or partial image behind
  if (maybe(0.65)) {
    const imageRows = maybe(0.5) ? 16 : randInt(8, 14)
    const imageCols = maybe(0.5) ? 12 : randInt(6, 12)
    slots.push({
      id: id(), role: 'image', z: 1,
      cell: clampCell({ c: 0, cs: imageCols, r: 0, rs: imageRows }),
      content: '',
    })
  }

  // Decide mark first so we know whether bottom-left is safe
  const emitMark = maybe(0.5)

  // 1–2 caption clusters in corners.
  // When a mark occupies r:ROWS-1 (bottom-left corner, c:0), exclude that
  // bottom-left corner from the caption set to avoid overlap.
  //   cornerIdx 0 = top-left    (r:0,    c:0)
  //   cornerIdx 1 = bottom-left (r:ROWS-2, c:0)  ← overlaps mark when rs:2
  //   cornerIdx 2 = top-right   (r:0,    c:COLS-4)
  //   cornerIdx 3 = bottom-right(r:ROWS-2, c:COLS-4)
  const captionCount = randInt(1, 2)
  const cornerR = [0, ROWS - 2]
  const cornerC = [0, COLS - 4]

  // When mark is emitted, exclude cornerIdx 1 (bottom-left)
  const availableCorners = emitMark
    ? [0, 2, 3]   // skip bottom-left (idx 1)
    : [0, 1, 2, 3]

  const usedCorners = new Set<number>()
  for (let i = 0; i < Math.min(captionCount, availableCorners.length); i++) {
    let pick_idx = Math.floor(Math.random() * availableCorners.length)
    while (usedCorners.has(pick_idx)) pick_idx = Math.floor(Math.random() * availableCorners.length)
    usedCorners.add(pick_idx)
    const cornerIdx = availableCorners[pick_idx]
    const r = cornerR[cornerIdx % 2]
    const c = cornerC[Math.floor(cornerIdx / 2)]
    slots.push({
      id: id(), role: 'caption', z: 4,
      cell: clampCell({ c, cs: 4, r, rs: 2 }),
      content: i === 0 ? pick(VOLUMES) : pick(DATES),
      text: captionText(18, c > 4 ? 'right' : 'left'),
      typeClass: 'body',
    })
  }

  // Optional small mark / footer — moved to right side (c:8) to avoid overlap
  // with any caption that may be in the top-left or bottom-left corners.
  if (emitMark) {
    slots.push({
      id: id(), role: 'mark', z: 4,
      cell: clampCell({ c: 8, cs: 4, r: ROWS - 1, rs: 1 }),
      content: pick(FOOTERS),
      text: captionText(16, 'right'),
      typeClass: 'body',
    })
  }

  return slots
}

// ---------------------------------------------------------------------------
// Strategy 2: editorial-zones
// Headline top-left or top-right; date/number block opposite; framed image
// in a random column band; 2–3 caption blocks in corners.
//
// FIX #1 (editorial-zones):
//  - r:1 is reserved (headline + date live there) — never seed a caption at r:1.
//  - Captions go on the OPPOSITE column-half from the date block.
// ---------------------------------------------------------------------------
function editorialZones(id: () => string): Slot[] {
  const slots: Slot[] = []

  const headlineLeft = maybe(0.5)
  const headlineCols = randInt(5, 7)
  const headlineColStart = headlineLeft ? 0 : COLS - headlineCols
  const headlineSize = randInt(100, 160)

  slots.push({
    id: id(), role: 'headline', z: 3,
    cell: clampCell({ c: headlineColStart, cs: headlineCols, r: 1, rs: 3 }),
    content: pick(HEADLINES),
    text: titleText(headlineSize, headlineLeft ? 'left' : 'right'),
    typeClass: 'title',
  })

  // Date/number block in opposing region — track its column start.
  // typeClass:'body' so the headline unambiguously dominates the hierarchy.
  const dateCols = randInt(3, 5)
  const dateColStart = headlineLeft ? COLS - dateCols : 0
  const dateSize = randInt(60, 90)
  slots.push({
    id: id(), role: 'date', z: 3,
    cell: clampCell({ c: dateColStart, cs: dateCols, r: 1, rs: 2 }),
    content: pick(DATES),
    text: headlineText(dateSize, headlineLeft ? 'right' : 'left'),
    typeClass: 'body',
  })

  // Framed image — mid band
  const imageCols = randInt(5, 8)
  const imageColStart = maybe(0.5) ? 0 : COLS - imageCols
  const imageRowStart = randInt(4, 6)
  const imageRowSpan = randInt(7, 10)
  slots.push({
    id: id(), role: 'image', z: 2,
    cell: clampCell({ c: imageColStart, cs: imageCols, r: imageRowStart, rs: imageRowSpan }),
    content: '',
  })

  // Captions:
  //  - Never use r:1 (reserved for headline/date band).
  //  - Place captions on the column side OPPOSITE the date block.
  //    date is on the right when headlineLeft=true → captions go left (c:0).
  //    date is on the left when headlineLeft=false → captions go right (c:COLS-4).
  const captionColStart = headlineLeft ? 0 : COLS - 4
  const captionAlign = headlineLeft ? 'left' : 'right'

  // Safe caption rows: after the image ends, or near the bottom — never r:1.
  const afterImageRow = Math.min(imageRowStart + imageRowSpan + 1, ROWS - 3)
  const captionRows = [afterImageRow, ROWS - 3, ROWS - 2]

  for (let i = 0; i < randInt(2, 3); i++) {
    const capRow = captionRows[i] ?? (ROWS - 2)
    slots.push({
      id: id(), role: 'caption', z: 4,
      cell: clampCell({ c: captionColStart, cs: 4, r: capRow, rs: 1 }),
      content: i === 0 ? pick(VOLUMES) : i === 1 ? pick(CITIES) : pick(FOOTERS),
      text: captionText(18, captionAlign),
      typeClass: 'body',
    })
  }

  return slots
}

// ---------------------------------------------------------------------------
// Strategy 3: index-list
// Title + multi-line index list down one side; image or block on the other.
// ---------------------------------------------------------------------------
function indexList(id: () => string): Slot[] {
  const slots: Slot[] = []

  const listLeft = maybe(0.5)
  const listCols = randInt(5, 6)
  const listColStart = listLeft ? 0 : COLS - listCols
  const imageColStart = listLeft ? listCols + 1 : 0
  const imageCols = COLS - listCols - 1

  // Title at top of list column
  const titleSize = randInt(60, 100)
  slots.push({
    id: id(), role: 'headline', z: 3,
    cell: clampCell({ c: listColStart, cs: listCols, r: 1, rs: 2 }),
    content: pick(HEADLINES),
    text: titleText(titleSize, 'left'),
    typeClass: 'title',
  })

  // Index lines
  const indexContent = INDEX_LINES.slice(0, randInt(3, 5)).join('\n')
  slots.push({
    id: id(), role: 'index', z: 3,
    cell: clampCell({ c: listColStart, cs: listCols, r: 4, rs: 8 }),
    content: indexContent,
    text: bodyText(20, 'left'),
    typeClass: 'body',
  })

  // Image or block on the other side
  if (maybe(0.7)) {
    const imageRows = randInt(12, 16)
    slots.push({
      id: id(), role: 'image', z: 2,
      cell: clampCell({ c: imageColStart, cs: imageCols, r: 0, rs: imageRows }),
      content: '',
    })
  } else {
    slots.push({
      id: id(), role: 'block', z: 2,
      cell: clampCell({ c: imageColStart, cs: imageCols, r: 2, rs: 12 }),
      content: '',
      fill: 'accent',
    })
  }

  // Small footer
  slots.push({
    id: id(), role: 'caption', z: 4,
    cell: clampCell({ c: 0, cs: 6, r: ROWS - 1, rs: 1 }),
    content: pick(FOOTERS),
    text: captionText(16, 'left'),
    typeClass: 'body',
  })

  // Volume kicker
  slots.push({
    id: id(), role: 'caption', z: 4,
    cell: clampCell({ c: COLS - 4, cs: 4, r: ROWS - 1, rs: 1 }),
    content: pick(VOLUMES),
    text: captionText(16, 'right'),
    typeClass: 'body',
  })

  return slots
}

// ---------------------------------------------------------------------------
// Strategy 4: numeral
// Giant number/date centered or offset; kicker + caption framing it;
// optional thin accent line.
// ---------------------------------------------------------------------------
function numeral(id: () => string): Slot[] {
  const slots: Slot[] = []

  const centered = maybe(0.5)
  const numeralSize = randInt(260, 380)
  const numeralCols = centered ? 12 : randInt(8, 12)
  const numeralColStart = centered ? 0 : maybe(0.5) ? 0 : COLS - numeralCols
  const numeralRow = randInt(5, 9)
  const numeralRowSpan = randInt(3, 5)
  const align = centered ? 'center' : (numeralColStart === 0 ? 'left' : 'right')

  slots.push({
    id: id(), role: 'date', z: 3,
    cell: clampCell({ c: numeralColStart, cs: numeralCols, r: numeralRow, rs: numeralRowSpan }),
    content: maybe(0.6) ? pick(YEARS) : pick(NUMERALS),
    text: headlineText(numeralSize, align),
    typeClass: 'headline',
  })

  // Kicker above
  slots.push({
    id: id(), role: 'subhead', z: 3,
    cell: clampCell({ c: 0, cs: 8, r: numeralRow - 2, rs: 1 }),
    content: pick(SUBHEADS),
    text: bodyText(22, 'left'),
    typeClass: 'body',
  })

  // Caption below
  slots.push({
    id: id(), role: 'caption', z: 3,
    cell: clampCell({ c: 0, cs: 6, r: numeralRow + numeralRowSpan + 1, rs: 1 }),
    content: pick(DATES),
    text: captionText(18, 'left'),
    typeClass: 'body',
  })

  // Title at top
  const topTitleSize = randInt(50, 80)
  slots.push({
    id: id(), role: 'headline', z: 3,
    cell: clampCell({ c: 0, cs: 8, r: 1, rs: 2 }),
    content: pick(HEADLINES),
    text: titleText(topTitleSize, 'left'),
    typeClass: 'title',
  })

  // Optional accent line
  if (maybe(0.6)) {
    const lineRow = numeralRow + numeralRowSpan + 2
    slots.push({
      id: id(), role: 'line', z: 2,
      cell: clampCell({ c: 0, cs: 12, r: Math.min(lineRow, ROWS - 2), rs: 1 }),
      content: '',
      fill: 'accent',
    })
  }

  // Footer
  slots.push({
    id: id(), role: 'mark', z: 4,
    cell: clampCell({ c: COLS - 4, cs: 4, r: ROWS - 1, rs: 1 }),
    content: pick(FOOTERS),
    text: captionText(16, 'right'),
    typeClass: 'body',
  })

  return slots
}

// ---------------------------------------------------------------------------
// Strategy 5: diptych
// Hard split — image one half, stacked title+caption text the other;
// optional accent block or line at the divide.
//
// FIX #1 (diptych): ensure titleRowStart + titleRowSpan + 1 + 2 <= ROWS - 2
// so the subhead never runs into r:15 (the footer row).
// Cap titleRowStart at 8 (was 9) so with titleRowSpan up to 4:
//   worst case subhead row = 8+4+1 = 13, rs:2 → ends at 15 ≤ ROWS-1=15 ✓
//   footer at r:15 stays clear of subhead which ends at ≤15.
// If they still touch, resolveTextCollisions will relocate the subhead.
// ---------------------------------------------------------------------------
function diptych(id: () => string): Slot[] {
  const slots: Slot[] = []

  const imageLeft = maybe(0.5)
  const splitCol = randInt(5, 7)

  const imageColStart = imageLeft ? 0 : splitCol
  const imageCols = imageLeft ? splitCol : COLS - splitCol

  const textColStart = imageLeft ? splitCol : 0
  const textCols = imageLeft ? COLS - splitCol : splitCol
  const textAlign = imageLeft ? 'left' : 'right'

  // Full-height image
  slots.push({
    id: id(), role: 'image', z: 1,
    cell: clampCell({ c: imageColStart, cs: imageCols, r: 0, rs: 16 }),
    content: '',
  })

  // Title on text side — cap titleRowStart at 8 (down from 9) so subhead fits
  const titleSize = randInt(80, 140)
  const titleRowStart = randInt(6, 8)
  const titleRowSpan = randInt(3, 4)
  slots.push({
    id: id(), role: 'headline', z: 3,
    cell: clampCell({ c: textColStart, cs: textCols, r: titleRowStart, rs: titleRowSpan }),
    content: pick(HEADLINES),
    text: titleText(titleSize, textAlign),
    typeClass: 'title',
  })

  // Kicker
  slots.push({
    id: id(), role: 'caption', z: 3,
    cell: clampCell({ c: textColStart, cs: textCols, r: 1, rs: 1 }),
    content: pick(VOLUMES),
    text: captionText(18, textAlign),
    typeClass: 'body',
  })

  // Subhead — placed just after the title; capped so it doesn't hit r:ROWS-1
  const subheadRow = Math.min(titleRowStart + titleRowSpan + 1, ROWS - 3)
  slots.push({
    id: id(), role: 'subhead', z: 3,
    cell: clampCell({ c: textColStart, cs: textCols, r: subheadRow, rs: 2 }),
    content: pick(SUBHEADS),
    text: bodyText(20, textAlign),
    typeClass: 'body',
  })

  // Footer at r:ROWS-1
  slots.push({
    id: id(), role: 'caption', z: 3,
    cell: clampCell({ c: textColStart, cs: textCols, r: ROWS - 1, rs: 1 }),
    content: pick(FOOTERS),
    text: captionText(16, textAlign),
    typeClass: 'body',
  })

  // Optional accent block or line at divide
  if (maybe(0.5)) {
    if (maybe(0.5)) {
      // Thin block at divide
      slots.push({
        id: id(), role: 'block', z: 4,
        cell: clampCell({ c: splitCol - 1, cs: 1, r: 0, rs: 16 }),
        content: '',
        fill: 'accent',
      })
    } else {
      // Horizontal accent line
      slots.push({
        id: id(), role: 'line', z: 4,
        cell: clampCell({ c: textColStart, cs: textCols, r: titleRowStart - 1, rs: 1 }),
        content: '',
        fill: 'accent',
      })
    }
  }

  return slots
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

type Strategy = 'big-word' | 'editorial-zones' | 'index-list' | 'numeral' | 'diptych'
const STRATEGIES: Strategy[] = ['big-word', 'editorial-zones', 'index-list', 'numeral', 'diptych']

export function generate(format: Format): Design {
  const id = makeIdGen()

  // Random palette (bias toward darker palettes for editorial drama)
  const paletteIdx = Math.floor(Math.random() * PRESET_PALETTES.length)
  const palette = { ...PRESET_PALETTES[paletteIdx].palette }

  // Random style — bias bwImage + filmGrain ~70%, gridOverlay ~25%
  const style = {
    accentHeadline: maybe(0.4),
    bwImage: maybe(0.7),
    filmGrain: maybe(0.7),
    gridOverlay: maybe(0.25),
  }

  // Random strategy
  const strategy = pick(STRATEGIES)
  let rawSlots: Slot[]
  switch (strategy) {
    case 'big-word':        rawSlots = bigWord(id);        break
    case 'editorial-zones': rawSlots = editorialZones(id); break
    case 'index-list':      rawSlots = indexList(id);      break
    case 'numeral':         rawSlots = numeral(id);        break
    case 'diptych':         rawSlots = diptych(id);        break
  }

  // Assign z by order of insertion (strategy fns already set z, but ensure all have it)
  const preSlots = rawSlots.map((s, i) => ({ ...s, z: s.z ?? i }))

  // Final-pass collision guard: resolve text-on-text overlaps
  const slots = resolveTextCollisions(preSlots, COLS, ROWS)

  // Random typography (sane ranges)
  const typography = {
    ...DEFAULT_TYPOGRAPHY,
    title: randInt(100, 140),
    headline: randInt(180, 260),
    body: randInt(16, 22),
    tracking: maybe(0.5) ? -0.03 : -0.01,
    leading: maybe(0.5) ? 0.88 : 0.92,
    typeface: maybe(0.6) ? 'display' as const : 'sans' as const,
  }

  return {
    format,
    grid: defaultGrid(),
    archetype: 'generated',
    palette,
    seed: Math.floor(Math.random() * 1_000_000_000),
    mode: 'grid',
    slots,
    typography,
    style,
    layout: 0,
  }
}

export type { Strategy }
export { cellsIntersect, resolveTextCollisions }

import type { Design, Format, GenerationReadability, GridCell, Slot, SwissGrammar, TextStyle } from '../types'
import { defaultGrid } from './formats'
import { PRESET_PALETTES } from './palettes'
import { DEFAULT_TYPOGRAPHY } from './typeclass'
import { mulberry32 } from '../lib/rng'

// ---------------------------------------------------------------------------
// Editorial content pools (expanded for variety)
// ---------------------------------------------------------------------------
// Strong words + multi-word phrases. Phrases stack across 2–3 lines (like
// "HALF AND HALF") which reads as a proper Swiss display headline. We bias the
// generator to prefer these multi-word phrases for the dominant element.
const HEADLINE_PHRASES = [
  'HALF AND HALF', 'PUSH THE LIMITS', 'WORLD WIDE', 'MAIN STAGE',
  'CHASING HORIZONS', 'AFTER HOURS', 'FULL CIRCLE', 'OFF THE GRID',
  'THE LONG RUN', 'CLOSE RANGE', 'OPEN CALL', 'IN MOTION', 'NIGHT SHIFT',
  'HARD EDGE', 'DEEP FIELD', 'NEW FORM', 'RUN MELB', 'FIELD NOTES',
  'SLOW LIGHT', 'WIDE OPEN', 'FUTURE TENSE', 'PLAIN SIGHT',
]
const HEADLINE_WORDS = [
  'SIGNAL', 'DRIFT', 'PULSE', 'FRAME', 'OPEN', 'FIELD', 'FORM',
  'MOMENTUM', 'HORIZON', 'CADENCE', 'TERRAIN', 'OVERTURE', 'PARALLEL',
  'AFTERLIGHT', 'GROUNDWORK', 'CROSSING', 'THRESHOLD', 'DISTANCE',
]
// Pool used by the dominant — phrases weighted ~2× so they're favored.
const HEADLINES = [...HEADLINE_PHRASES, ...HEADLINE_PHRASES, ...HEADLINE_WORDS]
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
// Seeded helpers
// ---------------------------------------------------------------------------
let random: () => number = Math.random

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)]
}

function maybe(prob: number): boolean {
  return random() < prob
}

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

// ---------------------------------------------------------------------------
// Slot id counter (simple sequential, reset per call via closure)
// ---------------------------------------------------------------------------
function makeIdGen(seed: number, candidateIndex: number) {
  let n = 0
  return () => `gen-${seed}-${candidateIndex}-${n++}`
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
  grammar: SwissGrammar
  imageTreatment: ImageTreatment
  dominantType: DominantType
  dominantAnchor: DominantAnchor
  dominantSize: number
  clusterCount: number
  clusterKinds: ClusterKind[]
  accentType: AccentType
}

// Anchors exclude pure center — Swiss grid prefers edge tension
const DOMINANT_ANCHORS: DominantAnchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left-band', 'right-band', 'top-band', 'bottom-band', 'mid-left', 'mid-right']
const SWISS_GRAMMARS: SwissGrammar[] = [
  'split-field',
  'asymmetric-headline',
  'modular-catalog',
  'typographic-monument',
  'image-diptych',
  'index-rail',
]

function grammarSkeleton(grammar: SwissGrammar): Pick<Skeleton, 'imageTreatment' | 'dominantType' | 'dominantAnchor' | 'clusterKinds' | 'accentType'> {
  switch (grammar) {
    case 'split-field':
      return {
        imageTreatment: pick(['half-split-left', 'half-split-right', 'framed-block'] as ImageTreatment[]),
        dominantType: pick(['mega-word', 'headline-stack'] as DominantType[]),
        dominantAnchor: pick(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'mid-left', 'mid-right'] as DominantAnchor[]),
        clusterKinds: shuffle(['meta', 'date', 'footer-mark', 'caption']).slice(0, randInt(1, 2)) as ClusterKind[],
        accentType: pick(['none', 'h-rule', 'v-rule'] as AccentType[]),
      }
    case 'asymmetric-headline':
      return {
        imageTreatment: pick(['none', 'framed-block', 'h-band'] as ImageTreatment[]),
        dominantType: pick(['mega-word', 'mega-word', 'headline-stack'] as DominantType[]),
        dominantAnchor: pick(['top-left', 'bottom-left', 'top-right', 'bottom-right', 'left-band', 'right-band'] as DominantAnchor[]),
        clusterKinds: shuffle(['kicker', 'date', 'caption', 'footer-mark']).slice(0, randInt(1, 3)) as ClusterKind[],
        accentType: pick(['none', 'none', 'h-rule', 'accent-block'] as AccentType[]),
      }
    case 'modular-catalog':
      return {
        imageTreatment: pick(['framed-block', 'framed-block', 'none'] as ImageTreatment[]),
        dominantType: pick(['headline-stack', 'mega-word'] as DominantType[]),
        dominantAnchor: pick(['top-left', 'top-right', 'left-band', 'right-band'] as DominantAnchor[]),
        clusterKinds: shuffle(['index', 'meta', 'caption', 'date']).slice(0, 3) as ClusterKind[],
        accentType: pick(['none', 'h-rule', 'v-rule'] as AccentType[]),
      }
    case 'typographic-monument':
      return {
        imageTreatment: pick(['none', 'none', 'full-bleed'] as ImageTreatment[]),
        dominantType: pick(['mega-word', 'giant-numeral'] as DominantType[]),
        dominantAnchor: pick(['top-left', 'bottom-left', 'top-right', 'bottom-right', 'mid-left', 'mid-right'] as DominantAnchor[]),
        clusterKinds: shuffle(['date', 'footer-mark', 'meta']).slice(0, 1) as ClusterKind[],
        accentType: pick(['none', 'none', 'accent-block'] as AccentType[]),
      }
    case 'image-diptych':
      return {
        imageTreatment: pick(['half-split-left', 'half-split-right', 'framed-block'] as ImageTreatment[]),
        dominantType: pick(['headline-stack', 'mega-word'] as DominantType[]),
        dominantAnchor: pick(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as DominantAnchor[]),
        clusterKinds: shuffle(['caption', 'date', 'meta']).slice(0, randInt(1, 2)) as ClusterKind[],
        accentType: pick(['none', 'h-rule'] as AccentType[]),
      }
    case 'index-rail':
      return {
        imageTreatment: pick(['none', 'h-band', 'framed-block'] as ImageTreatment[]),
        dominantType: pick(['headline-stack', 'mega-word'] as DominantType[]),
        dominantAnchor: pick(['left-band', 'right-band', 'top-left', 'top-right'] as DominantAnchor[]),
        clusterKinds: ['index', ...shuffle(['footer-mark', 'date', 'meta']).slice(0, randInt(1, 2))] as ClusterKind[],
        accentType: pick(['v-rule', 'none', 'h-rule'] as AccentType[]),
      }
  }
}

function chooseSkeleton(grammar: SwissGrammar): Skeleton {
  const grammarDefaults = grammarSkeleton(grammar)
  const dominantType = grammarDefaults.dominantType
  // Size range varies by type
  const dominantSize = dominantType === 'mega-word' || dominantType === 'oversized-glyph'
    ? randInt(240, 380)
    : dominantType === 'giant-numeral'
      ? randInt(280, 400)
      : randInt(120, 220) // headline-stack

  const clusterKinds = grammarDefaults.clusterKinds

  return {
    grammar,
    imageTreatment: grammarDefaults.imageTreatment,
    dominantType,
    dominantAnchor: grammarDefaults.dominantAnchor,
    dominantSize,
    clusterCount: clusterKinds.length,
    clusterKinds,
    accentType: grammarDefaults.accentType,
  }
}

// ---------------------------------------------------------------------------
// Image placement — maps ImageTreatment to a concrete GridCell
// ---------------------------------------------------------------------------

const FULL_BLEED_CELL: GridCell = { c: 0, cs: COLS, r: 0, rs: ROWS }

/** Candidate cells for a treatment, in preference order. The image placer tries
 *  these and uses the FIRST one that is free (doesn't overlap the already-placed
 *  dominant), so the image lands in clean space — never on the text. */
function imageCandidates(treatment: ImageTreatment): GridCell[] {
  switch (treatment) {
    case 'none': return []
    case 'full-bleed': return [FULL_BLEED_CELL]
    case 'framed-block': {
      // A medium block placed in each quadrant/side, so at least one avoids the dominant.
      return [
        { c: 0, cs: 6, r: 5, rs: 9 }, { c: COLS - 6, cs: 6, r: 5, rs: 9 },
        { c: 0, cs: 6, r: 1, rs: 8 }, { c: COLS - 6, cs: 6, r: 1, rs: 8 },
        { c: 3, cs: 6, r: 4, rs: 9 }, { c: 0, cs: 7, r: 6, rs: 9 },
      ].map(clampCell)
    }
    case 'half-split-left':
      return [{ c: 0, cs: 6, r: 0, rs: ROWS }, { c: COLS - 6, cs: 6, r: 0, rs: ROWS }].map(clampCell)
    case 'half-split-right':
      return [{ c: COLS - 6, cs: 6, r: 0, rs: ROWS }, { c: 0, cs: 6, r: 0, rs: ROWS }].map(clampCell)
    case 'h-band': {
      const rs = randInt(5, 8)
      // bottom band, then top band — whichever is clear of the dominant.
      return [
        { c: 0, cs: COLS, r: ROWS - rs, rs }, { c: 0, cs: COLS, r: 0, rs },
        { c: 0, cs: COLS, r: Math.floor((ROWS - rs) / 2), rs },
      ].map(clampCell)
    }
    case 'v-band': return [] // dropped — read as an accidental sliver
  }
}

/** Place the image AFTER the dominant: try treatment candidates and use the first
 *  that's free of the dominant (claim it so text wraps around). If none fit (the
 *  dominant is large), fall back to FULL-BLEED — the deliberate type-over-photo
 *  style, where the dominant sits on the photo intentionally. */
function placeImage(
  treatment: ImageTreatment,
  occ: OccupancyGrid,
  imgRegions: ImageRegionSet,
  id: () => string,
): Slot | null {
  if (treatment === 'none') return null
  const make = (cell: GridCell, claim: boolean): Slot => {
    imgRegions.mark(cell)
    if (claim) occ.claim(cell)
    return { id: id(), role: 'image', z: 1, cell, content: '' }
  }
  if (treatment === 'full-bleed') return make(FULL_BLEED_CELL, false)

  for (const cell of shuffle(imageCandidates(treatment))) {
    if (occ.isFree(cell)) return make(cell, true)
  }
  // No clean spot beside the dominant — become a full-bleed photo behind it.
  return make(FULL_BLEED_CELL, false)
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

/** Place the dominant text element. */
function placeDominant(
  skeleton: Skeleton,
  occ: OccupancyGrid,
  imgRegions: ImageRegionSet,
  bgColor: string,
  id: () => string,
): Slot[] {
  const z = 5 // dominant is always in front of everything else
  // Prefer the chosen anchor, but if it would land on the image (or other claimed
  // cells) fall through to the next anchor whose cell is FREE — so the dominant
  // headline sits in a clear zone beside/above the image, not on top of it. (For
  // full-bleed the grid is unclaimed, so the chosen anchor wins — type over photo.)
  const anchorOrder = [
    skeleton.dominantAnchor,
    ...shuffle(DOMINANT_ANCHORS.filter(a => a !== skeleton.dominantAnchor)),
  ]
  let cell = resolveDominantCell(skeleton.dominantAnchor, skeleton.dominantType)
  let align = anchorAlign(skeleton.dominantAnchor)
  for (const a of anchorOrder) {
    const cand = resolveDominantCell(a, skeleton.dominantType)
    if (occ.isFree(cand)) { cell = cand; align = anchorAlign(a); break }
  }

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
      // Retired from the dominant pool (it produced lone letters). Kept for the
      // exhaustive switch — now emits a full short word, never a single char.
      slot = {
        id: id(), role: 'glyph', z,
        cell,
        content: pick(HEADLINE_WORDS),
        text: titleText(skeleton.dominantSize, align),
        typeClass: 'title',
      }
      break
  }

  // Claim occupancy with the dominant element
  occ.claim(cell)
  void imgRegions; void bgColor // no scrims — real photos carry their own contrast

  return [slot!]
}

// ---------------------------------------------------------------------------
// Supporting cluster placement
// ---------------------------------------------------------------------------

/** Pool of candidate cells for cluster placement — corners and edge bands.
 *  These are evaluated in random order and the first free one wins. */
function clusterCandidates(): GridCell[] {
  // Cells are wide enough (cs >= 5) that captions/dates don't clip, and right-side
  // candidates are anchored to the right margin (c = COLS - cs) so right-aligned
  // text never runs off the edge.
  const candidates: GridCell[] = [
    // Corners — single row, generous width
    clampCell({ c: 0,        cs: 5, r: 0,        rs: 1 }),
    clampCell({ c: COLS - 5, cs: 5, r: 0,        rs: 1 }),
    clampCell({ c: 0,        cs: 5, r: ROWS - 1,  rs: 1 }),
    clampCell({ c: COLS - 5, cs: 5, r: ROWS - 1,  rs: 1 }),
    // Two-row corners (for stacked meta)
    clampCell({ c: 0,        cs: 5, r: 0,        rs: 2 }),
    clampCell({ c: COLS - 5, cs: 5, r: 0,        rs: 2 }),
    clampCell({ c: 0,        cs: 5, r: ROWS - 2,  rs: 2 }),
    clampCell({ c: COLS - 5, cs: 5, r: ROWS - 2,  rs: 2 }),
    // Mid-edge rails (for index lists)
    clampCell({ c: 0,        cs: 5, r: randInt(4, 8), rs: 3 }),
    clampCell({ c: COLS - 5, cs: 5, r: randInt(4, 8), rs: 3 }),
    // Full-width top / bottom bands
    clampCell({ c: 0,        cs: 6, r: 0, rs: 1 }),
    clampCell({ c: COLS - 6, cs: 6, r: 0, rs: 1 }),
    clampCell({ c: 0,        cs: 6, r: ROWS - 1, rs: 1 }),
    clampCell({ c: COLS - 6, cs: 6, r: ROWS - 1, rs: 1 }),
  ]
  // Shuffle order so clusters don't always land in the same priority corner
  return shuffle(candidates)
}

/** Create a cluster slot for the given kind and cell. */
function clusterSlot(kind: ClusterKind, cell: GridCell, z: number, id: () => string): Slot {
  const cRight = cell.c + cell.cs > COLS / 2
  const align = cRight ? 'right' : 'left'

  switch (kind) {
    case 'meta':
      return {
        id: id(), role: 'caption', z, cell,
        content: `${pick(CITIES)} — ${pick(VOLUMES)}`,
        text: captionText(16, align),
        typeClass: 'body',
      }
    case 'caption':
      return {
        id: id(), role: 'caption', z, cell,
        content: pick(CAPTIONS),
        text: captionText(18, align),
        typeClass: 'body',
      }
    case 'index': {
      const indexCell = clampCell({ ...cell, rs: Math.max(cell.rs, 3) })
      return {
        id: id(), role: 'index', z,
        cell: indexCell,
        content: INDEX_LINES.slice(0, Math.min(indexCell.rs, INDEX_LINES.length)).join('\n'),
        text: bodyText(18, 'left'),
        typeClass: 'body',
      }
    }
    case 'date':
      return {
        id: id(), role: 'date', z, cell,
        content: `${pick(DATES)}, ${pick(YEARS)}`,
        text: captionText(18, align),
        typeClass: 'body',
      }
    case 'kicker':
      return {
        id: id(), role: 'subhead', z, cell,
        content: pick(KICKERS),
        text: bodyText(20, align),
        typeClass: 'body',
      }
    case 'footer-mark':
      return {
        id: id(), role: 'mark', z, cell,
        content: pick(FOOTERS),
        text: captionText(16, align),
        typeClass: 'body',
      }
  }
}

/** Place 0..n supporting clusters in free occupancy slots.
 *  Each cluster gets a scrim if it lands on an image region. */
function placeSupportingClusters(
  skeleton: Skeleton,
  occ: OccupancyGrid,
  imgRegions: ImageRegionSet,
  bgColor: string,
  id: () => string,
): Slot[] {
  const result: Slot[] = []
  const zBase = 4 // clusters are below dominant (z:5) but above image (z:1)
  void imgRegions; void bgColor // clusters never overlap the image now, so no scrims

  for (const kind of skeleton.clusterKinds) {
    const candidates = clusterCandidates()
    let placed = false
    for (const cell of candidates) {
      // index needs rs:3 minimum
      const effectiveCell = kind === 'index' ? { ...cell, rs: Math.max(cell.rs, 3) } : cell
      const clamped = clampCell(effectiveCell)
      if (occ.isFree(clamped)) {
        occ.claim(clamped)
        result.push(clusterSlot(kind, clamped, zBase, id))
        placed = true
        break
      }
    }
    void placed
  }

  return result
}

// ---------------------------------------------------------------------------
// Accent placement
// ---------------------------------------------------------------------------

function placeAccent(
  skeleton: Skeleton,
  occ: OccupancyGrid,
  id: () => string,
): Slot | null {
  if (skeleton.accentType === 'none') return null

  switch (skeleton.accentType) {
    case 'h-rule': {
      // Thin horizontal line — place without occupancy claim (lines are decorative)
      const candidates = [2, 3, ROWS - 3, ROWS - 2, randInt(4, 10)]
      for (const r of candidates) {
        const cell = clampCell({ c: 0, cs: COLS, r, rs: 1 })
        return { id: id(), role: 'line', z: 2, cell, content: '', fill: 'accent' }
      }
      return null
    }
    case 'v-rule': {
      const c = maybe(0.5) ? 0 : COLS - 1
      const cell = clampCell({ c, cs: 1, r: 0, rs: ROWS })
      return { id: id(), role: 'line', z: 2, cell, content: '', fill: 'accent' }
    }
    case 'accent-block': {
      const candidates = [
        clampCell({ c: 0,        cs: 2, r: 0,        rs: 2 }),
        clampCell({ c: COLS - 2, cs: 2, r: 0,        rs: 2 }),
        clampCell({ c: 0,        cs: 2, r: ROWS - 2,  rs: 2 }),
        clampCell({ c: COLS - 2, cs: 2, r: ROWS - 2,  rs: 2 }),
      ]
      for (const cell of candidates) {
        if (occ.isFree(cell)) {
          occ.claim(cell)
          return { id: id(), role: 'block', z: 3, cell, content: '', fill: 'accent' }
        }
      }
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Whitespace enforcement — Swiss grid constraint: occupied ≤ 70% of grid
// ---------------------------------------------------------------------------

const MAX_OCCUPIED_FRACTION = 0.70
const TOTAL_CELLS = COLS * ROWS  // 192

/** Drop optional cluster slots until occupied fraction is ≤ 70%.
 *  Never drops: image, dominant (z:5).
 *  Drops: cluster text slots (z:4) from last to first. */
function enforceWhitespace(slots: Slot[], occ: OccupancyGrid): Slot[] {
  const maxCells = Math.floor(TOTAL_CELLS * MAX_OCCUPIED_FRACTION)
  if (occ.occupiedCount() <= maxCells) return slots

  const TEXT_ROLES_SET = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])
  const droppable = slots.filter(s => s.z === 4 && TEXT_ROLES_SET.has(s.role))

  const result = [...slots]
  for (let i = droppable.length - 1; i >= 0; i--) {
    if (occ.occupiedCount() <= maxCells) break
    const toDrop = droppable[i]
    const idx = result.findIndex(s => s.id === toDrop.id)
    if (idx !== -1) result.splice(idx, 1)
    // Remove paired scrim: same cell position, role: 'block', z = toDrop.z - 1
    const scrimIdx = result.findIndex(
      s => s.role === 'block' && s.z === (toDrop.z! - 1) &&
        s.cell.c === toDrop.cell.c && s.cell.r === toDrop.cell.r
    )
    if (scrimIdx !== -1) result.splice(scrimIdx, 1)
  }
  return result
}

// ---------------------------------------------------------------------------
// Compose — the single procedural composer (replaces all strategy functions)
// ---------------------------------------------------------------------------

function compose(
  id: () => string,
  palette: { bg: string; text: string; accent: string },
  skeleton: Skeleton,
): Slot[] {
  const occ = new OccupancyGrid(COLS, ROWS)
  const imgRegions = new ImageRegionSet(COLS, ROWS)

  const allSlots: Slot[] = []

  // 1. Dominant text FIRST (z:5, claims its cell) — it always gets its preferred
  //    anchor, and the image then fits into the clean space around it.
  const dominantSlots = placeDominant(skeleton, occ, imgRegions, palette.bg, id)
  allSlots.push(...dominantSlots)

  // 2. Image (z:1) — placed in free space beside the dominant, or full-bleed behind.
  const imageSlot = placeImage(skeleton.imageTreatment, occ, imgRegions, id)
  if (imageSlot) allSlots.push(imageSlot)

  // If the image ended up full-bleed (chosen OR fallback), keep the photo clean:
  // cap supporting clusters to ONE so metadata doesn't clutter the photo.
  const imageIsFullBleed =
    !!imageSlot &&
    imageSlot.cell.c === 0 && imageSlot.cell.cs === COLS &&
    imageSlot.cell.r === 0 && imageSlot.cell.rs === ROWS
  if (imageIsFullBleed && skeleton.clusterKinds.length > 1) {
    skeleton.clusterKinds = skeleton.clusterKinds.slice(0, 1)
  }

  // 3. Supporting clusters (z:4) — placed only in free cells (around the image).
  const clusterSlots = placeSupportingClusters(skeleton, occ, imgRegions, palette.bg, id)
  allSlots.push(...clusterSlots)

  // 4. Accent (z:2, optional)
  const accentSlot = placeAccent(skeleton, occ, id)
  if (accentSlot) allSlots.push(accentSlot)

  // 5. Whitespace enforcement: drop clusters if over 70% cell budget
  const budgetedSlots = enforceWhitespace(allSlots, occ)

  // 6. Final collision guard: text-on-text overlap resolution
  return resolveTextCollisions(budgetedSlots, COLS, ROWS)
}

// ---------------------------------------------------------------------------
// Candidate scoring
// ---------------------------------------------------------------------------

const TEXT_ROLES_SET = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])

function isFullBleedCell(cell: GridCell): boolean {
  return cell.c === 0 && cell.cs === COLS && cell.r === 0 && cell.rs === ROWS
}

function occupiedFraction(slots: Slot[]): number {
  const claimed = new Set<string>()
  for (const slot of slots.filter(s => s.role !== 'image' && s.role !== 'line')) {
    for (let r = slot.cell.r; r < slot.cell.r + slot.cell.rs; r++) {
      for (let c = slot.cell.c; c < slot.cell.c + slot.cell.cs; c++) {
        claimed.add(`${r},${c}`)
      }
    }
  }
  return claimed.size / TOTAL_CELLS
}

function analyzeReadability(slots: Slot[]): GenerationReadability {
  const textSlots = slots.filter(s => TEXT_ROLES_SET.has(s.role) && s.text)
  let textOverlapCount = 0
  for (let i = 0; i < textSlots.length; i++) {
    for (let j = i + 1; j < textSlots.length; j++) {
      if (cellsIntersect(textSlots[i].cell, textSlots[j].cell)) textOverlapCount++
    }
  }

  const imageCells = slots.filter(s => s.role === 'image').map(s => s.cell)
  const framedImages = imageCells.filter(c => !isFullBleedCell(c))
  let nonFullBleedTextImageOverlaps = 0
  for (const slot of textSlots) {
    if (framedImages.some(img => cellsIntersect(slot.cell, img))) {
      nonFullBleedTextImageOverlaps++
    }
  }

  const sizes = textSlots.map(s => s.text?.size ?? 0).sort((a, b) => b - a)
  const dominantRatio = sizes.length < 2 ? 3 : sizes[0] / Math.max(1, sizes[1])

  return {
    textOverlapCount,
    nonFullBleedTextImageOverlaps,
    titleCount: slots.filter(s => s.typeClass === 'title' && s.text).length,
    supportingTextCount: slots.filter(s => s.text && s.typeClass !== 'title').length,
    dominantRatio,
    occupiedFraction: occupiedFraction(slots),
  }
}

function edgeTensionScore(slots: Slot[]): number {
  const title = slots.find(s => s.typeClass === 'title' && s.text)
  if (!title) return 0
  const touchesEdge =
    title.cell.c === 0 ||
    title.cell.r === 0 ||
    title.cell.c + title.cell.cs === COLS ||
    title.cell.r + title.cell.rs === ROWS
  const centered = title.cell.c > 2 && title.cell.c + title.cell.cs < COLS - 2
  return touchesEdge ? 8 : centered ? -6 : 3
}

function scoreCandidate(slots: Slot[], skeleton: Skeleton): { score: number; readability: GenerationReadability } {
  const readability = analyzeReadability(slots)
  let score = 86

  score -= readability.textOverlapCount * 24
  score -= readability.nonFullBleedTextImageOverlaps * 24
  score -= Math.abs(readability.titleCount - 1) * 18
  if (readability.supportingTextCount === 0) score -= 12
  if (readability.dominantRatio < 2) score -= Math.round((2 - readability.dominantRatio) * 14)
  if (readability.occupiedFraction > 0.7) score -= Math.round((readability.occupiedFraction - 0.7) * 80)
  if (readability.occupiedFraction < 0.08) score -= 8
  score += edgeTensionScore(slots)
  if (slots.some(s => s.role === 'line' || s.role === 'block')) score += 2
  if (skeleton.grammar === 'modular-catalog' || skeleton.grammar === 'index-rail') {
    if (slots.some(s => s.role === 'index')) score += 5
  }
  if (skeleton.grammar === 'typographic-monument' && readability.supportingTextCount <= 1) score += 4
  if (slots.length > 6) score -= 3

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    readability,
  }
}

interface GenerateOptions {
  seed?: number
  candidateCount?: number
  grammar?: SwissGrammar
}

function buildCandidate(
  format: Format,
  seed: number,
  candidateIndex: number,
  candidateCount: number,
  grammar: SwissGrammar,
): Design {
  const id = makeIdGen(seed, candidateIndex)

  // Random palette
  const paletteIdx = Math.floor(random() * PRESET_PALETTES.length)
  const palette = { ...PRESET_PALETTES[paletteIdx].palette }

  // Random style — bias bwImage + filmGrain ~70%, gridOverlay ~25%
  const style = {
    accentHeadline: maybe(0.4),
    bwImage: maybe(0.7),
    filmGrain: maybe(0.7),
    gridOverlay: maybe(0.25),
  }

  const skeleton = chooseSkeleton(grammar)

  // Compose slots via the occupancy-grid procedural composer
  const rawSlots = compose(id, palette, skeleton)

  // Ensure all slots have z
  const slots = rawSlots.map((s, i) => ({ ...s, z: s.z ?? i }))

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

  const generation = scoreCandidate(slots, skeleton)

  return {
    format,
    grid: defaultGrid(),
    archetype: 'generated',
    palette,
    seed,
    mode: 'grid',
    slots,
    typography,
    style,
    layout: 0,
    generation: {
      grammar,
      score: generation.score,
      candidateCount,
      readability: generation.readability,
    },
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generate(format: Format, opts: GenerateOptions = {}): Design {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000)
  const candidateCount = Math.max(1, Math.floor(opts.candidateCount ?? 18))
  const previousRandom = random
  random = mulberry32(seed)

  try {
    const grammar = opts.grammar ?? pick(SWISS_GRAMMARS)
    let best: Design | null = null

    for (let i = 0; i < candidateCount; i++) {
      const candidate = buildCandidate(format, seed, i, candidateCount, grammar)
      if (!best || (candidate.generation?.score ?? 0) > (best.generation?.score ?? 0)) {
        best = candidate
      }
    }

    return best!
  } finally {
    random = previousRandom
  }
}

export { cellsIntersect, resolveTextCollisions }

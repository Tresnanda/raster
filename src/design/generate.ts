import type { Design, Format, GridCell, Slot, TextStyle } from '../types'
import { defaultGrid } from './formats'
import { PRESET_PALETTES } from './palettes'
import { DEFAULT_TYPOGRAPHY } from './typeclass'

// ---------------------------------------------------------------------------
// Editorial content pools
// ---------------------------------------------------------------------------
const HEADLINES = [
  'RUN', 'MAIN STAGE', 'NOW', 'FORM', 'FIELD', 'BLOC', 'OPEN',
  'SIGNAL', 'DRIFT', 'ZERO', 'EDGE', 'PULSE', 'GRID', 'LOOP',
]
const SUBHEADS = [
  'Chasing Horizons', 'In Full Motion', 'At The Limit',
  'New Perspectives', 'Against The Grain', 'Between Lines',
  'Surface Tension', 'High Contrast', 'No Compromise',
]
const DATES = ['15–26 June', '08–19 July', '01–12 Aug', '03–14 Sept', '20–31 Oct']
const VOLUMES = ['Vol. 01', 'Vol. 02', 'Vol. 03', 'Vol. 04', 'Vol. 05', 'Issue 12', 'Issue 07']
const YEARS = ['2024', '2025', '2026', '2027']
const CITIES = ['Berlin', 'Tokyo', 'Lagos', 'London', 'Seoul', 'Melbourne', 'Lisbon', 'New York']
const FOOTERS = ['raster.studio', 'studio & co.', 'form works', 'index press']
const NUMERALS = ['01', '02', '07', '12', '24', '36', '48', '99']
const INDEX_LINES = [
  'Opening  ——  p.01',
  'Field Notes  ——  p.12',
  'Long Read  ——  p.24',
  'Portfolio  ——  p.36',
  'Archive  ——  p.48',
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
// Strategy 1: big-word
// Huge headline spanning most width at a random vertical band; optional
// full-bleed image; 1–2 small caption clusters in random corners; optional mark.
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

  // 1–2 caption clusters in corners
  const captionCount = randInt(1, 2)
  const cornerR = [0, ROWS - 2]
  const cornerC = [0, COLS - 4]
  const usedCorners = new Set<number>()
  for (let i = 0; i < captionCount; i++) {
    let cornerIdx = Math.floor(Math.random() * 4)
    while (usedCorners.has(cornerIdx)) cornerIdx = Math.floor(Math.random() * 4)
    usedCorners.add(cornerIdx)
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

  // Optional small mark / footer
  if (maybe(0.5)) {
    slots.push({
      id: id(), role: 'mark', z: 4,
      cell: clampCell({ c: 0, cs: 4, r: ROWS - 1, rs: 1 }),
      content: pick(FOOTERS),
      text: captionText(16, 'left'),
      typeClass: 'body',
    })
  }

  return slots
}

// ---------------------------------------------------------------------------
// Strategy 2: editorial-zones
// Headline top-left or top-right; date/number block opposite; framed image
// in a random column band; 2–3 caption blocks in corners.
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

  // Date/number block in opposing region
  const dateCols = randInt(3, 5)
  const dateColStart = headlineLeft ? COLS - dateCols : 0
  const dateSize = randInt(60, 90)
  slots.push({
    id: id(), role: 'date', z: 3,
    cell: clampCell({ c: dateColStart, cs: dateCols, r: 1, rs: 2 }),
    content: pick(DATES),
    text: headlineText(dateSize, headlineLeft ? 'right' : 'left'),
    typeClass: 'headline',
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

  // 2–3 caption blocks
  const captionRows = [imageRowStart + imageRowSpan + 1, 1, ROWS - 2]
  const captionCols = [0, COLS - 4]
  for (let i = 0; i < randInt(2, 3); i++) {
    slots.push({
      id: id(), role: 'caption', z: 4,
      cell: clampCell({ c: captionCols[i % 2], cs: 4, r: captionRows[i] ?? (ROWS - 2), rs: 1 }),
      content: i === 0 ? pick(VOLUMES) : i === 1 ? pick(CITIES) : pick(FOOTERS),
      text: captionText(18, i % 2 === 0 ? 'left' : 'right'),
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

  // Title on text side
  const titleSize = randInt(80, 140)
  const titleRowStart = randInt(6, 9)
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

  // Subhead
  slots.push({
    id: id(), role: 'subhead', z: 3,
    cell: clampCell({ c: textColStart, cs: textCols, r: titleRowStart + titleRowSpan + 1, rs: 2 }),
    content: pick(SUBHEADS),
    text: bodyText(20, textAlign),
    typeClass: 'body',
  })

  // Footer
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

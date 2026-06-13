export type Format = '4:5' | '2:3' | '9:16' | '1:1' | '16:9' | '3:4' | 'A4'

export interface Canvas { w: number; h: number }

export interface Grid {
  cols: number
  rows: number
  margin: number
  gutter: number
}

/** Placement on the grid (0-indexed col/row start, span in cells). */
export interface GridCell { c: number; cs: number; r: number; rs: number }

/** Resolved pixel box. */
export interface Box { x: number; y: number; w: number; h: number }

export type FontFamily = 'sans' | 'display' | 'mono' | 'condensed'

export interface Typography {
  typeface: FontFamily
  title: number
  headline: number
  body: number
  tracking: number
  leading: number
}

export interface StyleOptions {
  accentHeadline: boolean
  bwImage: boolean
  filmGrain: boolean
  gridOverlay: boolean
}
export type Align = 'left' | 'center' | 'right'

export interface TextStyle {
  family: FontFamily
  weight: number
  /** px at canvas scale; ignored when fit === 'auto' (used as max). */
  size: number
  tracking: number   // letter-spacing em
  leading: number    // line-height multiple
  align: Align
  fit: 'auto' | 'fixed'
}

export type SlotRole =
  | 'headline' | 'subhead' | 'caption' | 'date' | 'index' | 'glyph'
  | 'mark' | 'image' | 'block' | 'line'

export interface Slot {
  id: string
  role: SlotRole
  cell: GridCell
  /** free-mode absolute override; when set, used instead of cell. */
  box?: Box
  content: string        // text, or image src (objectURL / dataURL / http URL)
  text?: TextStyle       // present for text roles
  fill?: string          // for 'block' role (uses palette token name or hex)
  typeClass?: 'title' | 'headline' | 'body'
  /** Z-order for rendering; fallback = array index. */
  z?: number
  /**
   * Names of TextStyle fields that have been explicitly overridden for this
   * element (e.g. ['size', 'family']). When a field name is in this list,
   * resolveTextStyle uses slot.text[field] instead of the global typography value.
   */
  overridden?: string[]
  /** Per-element text colour override (hex). Overrides palette.text / accent logic. */
  color?: string
  /** Per-element B&W override for image slots. Overrides style.bwImage when set. */
  bw?: boolean
  /** Image src (dataURL or URL) to clip into the text glyphs (image fill effect). */
  imageFill?: string
}

export interface Palette { bg: string; text: string; accent: string }

export interface Design {
  format: Format
  grid: Grid
  /** Archetype id, or `'generated'` for procedurally generated designs. */
  archetype: string
  palette: Palette
  seed: number
  mode: 'grid' | 'free'
  slots: Slot[]
  typography: Typography
  style: StyleOptions
  /** Layout number 1–19, or `0` for a procedurally generated design. */
  layout: number
}

export type Format = '4:5' | '2:3' | '9:16' | '1:1' | '16:9'

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
  | 'mark' | 'image' | 'block'

export interface Slot {
  id: string
  role: SlotRole
  cell: GridCell
  /** free-mode absolute override; when set, used instead of cell. */
  box?: Box
  content: string        // text, or image src (objectURL / dataURL / http URL)
  text?: TextStyle       // present for text roles
  fill?: string          // for 'block' role (uses palette token name or hex)
}

export interface Palette { bg: string; text: string; accent: string }

export interface Design {
  format: Format
  grid: Grid
  archetype: string
  palette: Palette
  seed: number
  mode: 'grid' | 'free'
  slots: Slot[]
}

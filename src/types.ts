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

export interface Shadow {
  dx: number
  dy: number
  blur: number
  color: string
}

export type ImageEffectKind =
  | 'none' | 'halftone' | 'color-halftone' | 'duotone' | 'dither'
  | 'posterize' | 'threshold' | 'invert' | 'grayscale'

export interface ImageEffect {
  kind: ImageEffectKind
  params: Record<string, number | string>
}

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
  /** Per-element opacity (0..1). Default is 1 when unset. */
  opacity?: number
  /** Rotation in degrees (-180..180). Positive = clockwise. */
  rotation?: number
  /** Mirror horizontally. */
  flipH?: boolean
  /** Mirror vertically. */
  flipV?: boolean
  /** Corner radius in px for block/image elements. */
  radius?: number
  /** Stroke colour: hex string, 'accent', or 'text'. */
  stroke?: string
  /** Stroke width in px. */
  strokeWidth?: number
  /** Drop shadow. null means explicitly cleared. */
  shadow?: Shadow | null
  /** CSS mix-blend-mode keyword. 'normal' or unset = no blend. */
  blend?: string
  /**
   * Pristine source image (cropped/uploaded dataURL or external URL).
   * The processing SOURCE -- never overwritten after initial placement.
   * Effects always re-process from this, so they are idempotent.
   */
  imageSrcOriginal?: string
  /** Current image effect descriptor. Source of truth for re-processing. */
  imageEffect?: ImageEffect

  // ── Layers pack ────────────────────────────────────────────────────────────
  /** Hidden layers are not rendered or exported and can't be selected. */
  hidden?: boolean
  /** Locked layers can't be moved/resized/deleted (still selectable to inspect). */
  locked?: boolean
  /** Optional custom layer name (shown in the Layers list). */
  name?: string

  // ── Type pack ──────────────────────────────────────────────────────────────
  /** Text case transform applied before measuring and rendering. */
  textTransform?: 'none' | 'upper' | 'lower' | 'title'
  /**
   * Hanging indent in px. When > 0, wrapped CONTINUATION lines of each
   * hard-line entry are shifted right by this amount (left-aligned only).
   */
  indent?: number
  /**
   * List prefix style. 'bullet' prefixes each hard line with "•  ";
   * 'number' prefixes "1.  ", "2.  " etc. 'none' (default) = no prefix.
   */
  listStyle?: 'none' | 'bullet' | 'number'
}

export interface Palette { bg: string; text: string; accent: string }

export type SwissGrammar =
  | 'split-field'
  | 'asymmetric-headline'
  | 'modular-catalog'
  | 'typographic-monument'
  | 'image-diptych'
  | 'index-rail'
  | 'occlusion-bar'

export type ExpressiveMove = 'none' | 'controlled-occlusion'

export interface GenerationBrief {
  density: 'quiet' | 'balanced' | 'dense'
  imageMode: 'none' | 'optional' | 'required'
  accentMode: 'none' | 'optional' | 'required'
}

export interface GenerationReadability {
  textOverlapCount: number
  nonFullBleedTextImageOverlaps: number
  titleCount: number
  supportingTextCount: number
  dominantRatio: number
  occupiedFraction: number
  expressiveMoveCount: number
  occludedTitleFraction: number
}

export interface GenerationMeta {
  grammar: SwissGrammar
  expressiveMove: ExpressiveMove
  brief: GenerationBrief
  score: number
  candidateCount: number
  readability: GenerationReadability
}

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
  /** Diagnostics for procedurally generated Surprise posters. */
  generation?: GenerationMeta
}

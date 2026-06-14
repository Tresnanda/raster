export type Measurer = (text: string, size: number) => number  // returns px width

export interface FitOpts {
  maxSize: number
  minSize: number
  leading: number
  /**
   * Baseline grid unit in px. When set (> 0), `lineAdvance` is snapped to the
   * nearest multiple of `baseline` that is >= `size * leading`. This aligns
   * multi-block layouts to a shared vertical rhythm.
   * Default (unset/0): lineAdvance = size * leading (current behaviour).
   */
  baseline?: number
}
export interface FitResult {
  size: number
  lines: string[]
  /** Per-line vertical advance in px. Use this for tspan y-positions and block height. */
  lineAdvance: number
}

function wrap(text: string, size: number, maxW: number, measure: Measurer): string[] {
  const lines: string[] = []
  // Honor explicit line breaks first: each \n is a HARD break the user intended.
  // Then word-wrap each segment independently so only genuinely-too-wide lines wrap.
  for (const segment of text.split('\n')) {
    const words = segment.split(/[ \t]+/).filter(Boolean)
    if (words.length === 0) { lines.push(''); continue }  // preserve blank lines
    let cur = ''
    for (const word of words) {
      const trial = cur ? cur + ' ' + word : word
      if (measure(trial, size) <= maxW || !cur) cur = trial
      else { lines.push(cur); cur = word }
    }
    if (cur) lines.push(cur)
  }
  return lines.length ? lines : ['']
}

/** Compute the per-line vertical advance, optionally snapped to a baseline grid. */
function computeLineAdvance(size: number, leading: number, baseline?: number): number {
  const natural = size * leading
  if (!baseline || baseline <= 0) return natural
  // Snap up to the next multiple of baseline, but never below the glyph size
  // so display text never overlaps even at large sizes.
  return Math.max(size, Math.round(natural / baseline) * baseline)
}

function fits(lines: string[], size: number, box: { w: number; h: number }, leading: number, measure: Measurer, baseline?: number): boolean {
  const widthOk = lines.every(l => measure(l, size) <= box.w)
  const lineAdvance = computeLineAdvance(size, leading, baseline)
  const heightOk = lines.length * lineAdvance <= box.h
  return widthOk && heightOk
}

export function fitText(text: string, box: { w: number; h: number }, opts: FitOpts, measure: Measurer): FitResult {
  for (let size = opts.maxSize; size >= opts.minSize; size -= 1) {
    const lines = wrap(text, size, box.w, measure)
    if (fits(lines, size, box, opts.leading, measure, opts.baseline)) {
      return { size, lines, lineAdvance: computeLineAdvance(size, opts.leading, opts.baseline) }
    }
  }
  const lines = wrap(text, opts.minSize, box.w, measure)
  return { size: opts.minSize, lines, lineAdvance: computeLineAdvance(opts.minSize, opts.leading, opts.baseline) }
}

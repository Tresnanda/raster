import type { Box, TextStyle } from '../types'
import { fitText } from '../lib/fit-text'
import { FONT_STACK, type Measure } from '../lib/measure'

/**
 * Hangable leading characters: punctuation that should optically hang
 * outside the left margin for left-aligned text.
 * Includes: straight ASCII quotes (U+0022 / U+0027), curly double/single
 * quotes (U+201C/D, U+2018/9), parenthesis, bracket, em/en dash, bullet,
 * guillemets. Unicode escapes used for straight quotes to avoid editor
 * smart-quote substitution.
 */
// eslint-disable-next-line no-misleading-character-class
const HANG_LEADING_RE = /^["'“”‘’([–—•‹›]/

/**
 * Hangable trailing characters: punctuation that should hang outside the
 * right margin for right-aligned text.
 * Includes: period, comma, semicolon, colon, punctuation, ASCII and curly quotes.
 */
const HANG_TRAILING_RE = /[.,;:!?"'“”‘’]$/

/**
 * Compute the x-offset adjustment for optical margin alignment (hanging punctuation).
 * Returns a POSITIVE number to add to x (shifts right) or NEGATIVE (shifts left).
 * Center-aligned text: always 0 (no hang).
 *
 * @param line   The text content of this tspan line.
 * @param align  The text alignment of the block.
 * @param size   The font size in px (used to scale the hang).
 * @returns      px offset to apply to the tspan's x position (0 if no hang).
 */
export function opticalHang(line: string, align: TextStyle['align'], size: number): number {
  const hang = size * 0.06
  if (align === 'left' && HANG_LEADING_RE.test(line)) return -hang
  if (align === 'right' && HANG_TRAILING_RE.test(line)) return hang
  return 0
}

/**
 * Maximum measure (wrap width) for body-class text, in multiples of size.
 * ~34em ≈ 65 characters at typical body tracking — a comfortable reading line.
 */
const BODY_MEASURE_FACTOR = 34

export function SlotText({ id, box, text, content, color, measure, imageFill, typeClass, baseline }: {
  id: string
  box: Box
  /** Pre-resolved effective TextStyle (use resolveTextStyle before rendering). */
  text: TextStyle
  content: string
  color: string
  measure: Measure
  imageFill?: string
  /** Typography class of this slot — used to apply body measure cap. */
  typeClass?: 'title' | 'headline' | 'body'
  /** Baseline grid unit in px (from baselineUnit(typography)). Snaps line advance. */
  baseline?: number
}) {
  const m = (t: string, size: number) => measure(t, size, text.family, text.weight)
  // 'auto' shrinks from text.size down to 9 to fit the box; 'fixed' pins at text.size
  const minSize = text.fit === 'fixed' ? text.size : 9

  // Body-class: cap the effective wrap width so long lines don't exceed ~34em.
  // Title/headline: always wrap against full box.w.
  const isBody = typeClass === 'body' || typeClass === undefined
  const maxW = isBody ? Math.min(box.w, BODY_MEASURE_FACTOR * text.size) : box.w
  const fitBox = maxW < box.w ? { ...box, w: maxW } : box

  const { size, lines, lineAdvance } = fitText(
    content,
    fitBox,
    { maxSize: text.size, minSize, leading: text.leading, baseline },
    m,
  )

  const anchor: 'middle' | 'end' | 'start' =
    text.align === 'center' ? 'middle' : text.align === 'right' ? 'end' : 'start'
  const ax = text.align === 'center' ? box.x + box.w / 2 : text.align === 'right' ? box.x + box.w : box.x
  const blockH = lines.length * lineAdvance
  // vertical-center within box
  const y = box.y + (box.h - blockH) / 2 + size * 0.8

  // Shared tspan children — identical geometry for both clip and visible copies,
  // ensuring the clipPath text and rendered text never drift.
  const tspans = lines.map((line, i) => {
    const hangOffset = opticalHang(line, text.align, size)
    return (
      <tspan key={i} x={ax + hangOffset} y={y + i * lineAdvance}>{line}</tspan>
    )
  })

  if (imageFill) {
    const clipId = `fill-${id}`
    return (
      <>
        <defs>
          <clipPath id={clipId}>
            <text
              fontFamily={FONT_STACK[text.family]}
              fontWeight={text.weight}
              fontSize={size}
              textAnchor={anchor}
              style={{ letterSpacing: `${text.tracking}em` }}
            >
              {tspans}
            </text>
          </clipPath>
        </defs>
        <image
          href={imageFill}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      </>
    )
  }

  return (
    <text
      fontFamily={FONT_STACK[text.family]} fontWeight={text.weight} fontSize={size}
      fill={color} textAnchor={anchor}
      style={{ letterSpacing: `${text.tracking}em` }}
    >
      {tspans}
    </text>
  )
}

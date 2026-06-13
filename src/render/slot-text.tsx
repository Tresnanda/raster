import type { Box, TextStyle } from '../types'
import { fitText } from '../lib/fit-text'
import { FONT_STACK, type Measure } from '../lib/measure'

export function SlotText({ id, box, text, content, color, measure, imageFill }: {
  id: string
  box: Box
  /** Pre-resolved effective TextStyle (use resolveTextStyle before rendering). */
  text: TextStyle
  content: string
  color: string
  measure: Measure
  imageFill?: string
}) {
  const m = (t: string, size: number) => measure(t, size, text.family, text.weight)
  // 'auto' shrinks from text.size down to 9 to fit the box; 'fixed' pins at text.size
  const minSize = text.fit === 'fixed' ? text.size : 9
  const { size, lines } = fitText(content, box, { maxSize: text.size, minSize, leading: text.leading }, m)

  const anchor: 'middle' | 'end' | 'start' =
    text.align === 'center' ? 'middle' : text.align === 'right' ? 'end' : 'start'
  const ax = text.align === 'center' ? box.x + box.w / 2 : text.align === 'right' ? box.x + box.w : box.x
  const blockH = lines.length * size * text.leading
  // vertical-center within box
  const y = box.y + (box.h - blockH) / 2 + size * 0.8

  // Shared tspan children — identical geometry for both clip and visible copies,
  // ensuring the clipPath text and rendered text never drift.
  const tspans = lines.map((line, i) => (
    <tspan key={i} x={ax} y={y + i * size * text.leading}>{line}</tspan>
  ))

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

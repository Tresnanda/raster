import type { Box, TextStyle } from '../types'
import { fitText } from '../lib/fit-text'
import { FONT_STACK, type Measure } from '../lib/measure'

export function SlotText({ box, text, content, color, measure }: {
  box: Box
  /** Pre-resolved effective TextStyle (use resolveTextStyle before rendering). */
  text: TextStyle
  content: string
  color: string
  measure: Measure
}) {
  const m = (t: string, size: number) => measure(t, size, text.family, text.weight)
  // 'auto' shrinks from text.size down to 9 to fit the box; 'fixed' pins at text.size
  const minSize = text.fit === 'fixed' ? text.size : 9
  const { size, lines } = fitText(content, box, { maxSize: text.size, minSize, leading: text.leading }, m)

  const anchor = text.align === 'center' ? 'middle' : text.align === 'right' ? 'end' : 'start'
  const ax = text.align === 'center' ? box.x + box.w / 2 : text.align === 'right' ? box.x + box.w : box.x
  const blockH = lines.length * size * text.leading
  // vertical-center within box
  const y = box.y + (box.h - blockH) / 2 + size * 0.8

  return (
    <text
      fontFamily={FONT_STACK[text.family]} fontWeight={text.weight} fontSize={size}
      fill={color} textAnchor={anchor}
      style={{ letterSpacing: `${text.tracking}em` }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={ax} y={y + i * size * text.leading}>{line}</tspan>
      ))}
    </text>
  )
}

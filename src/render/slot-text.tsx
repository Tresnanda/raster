import type { Box, Slot } from '../types'
import { fitText } from '../lib/fit-text'
import { FONT_STACK, type Measure } from '../lib/measure'

export function SlotText({ box, slot, color, measure }: {
  box: Box; slot: Slot; color: string; measure: Measure
}) {
  const t = slot.text!
  const m = (text: string, size: number) => measure(text, size, t.family, t.weight)
  // 'auto' shrinks from t.size down to 9 to fit the box; 'fixed' pins at t.size
  // (still wraps at that size, allowing overflow rather than shrinking).
  const minSize = t.fit === 'fixed' ? t.size : 9
  const { size, lines } = fitText(slot.content, box, { maxSize: t.size, minSize, leading: t.leading }, m)

  const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start'
  const ax = t.align === 'center' ? box.x + box.w / 2 : t.align === 'right' ? box.x + box.w : box.x
  const blockH = lines.length * size * t.leading
  // vertical-center within box
  const y = box.y + (box.h - blockH) / 2 + size * 0.8

  return (
    <text
      fontFamily={FONT_STACK[t.family]} fontWeight={t.weight} fontSize={size}
      fill={color} textAnchor={anchor}
      style={{ letterSpacing: `${t.tracking}em` }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={ax} y={y + i * size * t.leading}>{line}</tspan>
      ))}
    </text>
  )
}

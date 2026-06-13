import type { Design } from '../types'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { defaultMeasurer, type Measure } from '../lib/measure'
import { SlotImage } from './slot-image'
import { SlotText } from './slot-text'

export function Renderer({ design, measure, svgRef }: {
  design: Design
  measure?: Measure
  svgRef?: React.Ref<SVGSVGElement>
}) {
  const canvas = canvasFor(design.format)
  const m = measure ?? defaultMeasurer()

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      width="100%" height="100%"
    >
      <rect data-bg x={0} y={0} width={canvas.w} height={canvas.h} fill={design.palette.bg} />
      {design.slots.map(slot => {
        const box = slotBox(canvas, design.grid, slot)
        if (slot.role === 'image') return <SlotImage key={slot.id} box={box} src={slot.content} />
        if (slot.role === 'block') {
          const fill = slot.fill === 'accent' ? design.palette.accent
            : slot.fill === 'text' ? design.palette.text : (slot.fill ?? design.palette.accent)
          return <rect key={slot.id} x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
        }
        return <SlotText key={slot.id} box={box} slot={slot} color={design.palette.text} measure={m} />
      })}
    </svg>
  )
}

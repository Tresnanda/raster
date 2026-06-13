import type React from 'react'
import type { Design } from '../types'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { defaultMeasurer, type Measure } from '../lib/measure'
import { classOf } from '../design/typeclass'
import { resolveTextStyle } from './resolve-style'
import { SlotImage } from './slot-image'
import { SlotText } from './slot-text'
import { orderedSlots } from '../design/order'

const GRAIN_SEED = 7

export function Renderer({ design, measure, svgRef }: {
  design: Design
  measure?: Measure
  svgRef?: React.Ref<SVGSVGElement>
}) {
  const canvas = canvasFor(design.format)
  const m = measure ?? defaultMeasurer()
  const { palette, grid, style, typography } = design

  // ---- Grid overlay lines ----
  const gridLines = (() => {
    if (!style.gridOverlay) return null
    const { cols, rows, margin, gutter } = grid
    const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
    const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows

    const verticals: number[] = []
    for (let c = 0; c <= cols; c++) {
      // left edge of col c (or right edge after last col)
      verticals.push(margin + c * (colW + gutter) - (c > 0 ? gutter : 0))
    }
    // Actually compute column boundary x positions correctly:
    // left edge of each column + right edge of last column
    const vLines: number[] = []
    for (let c = 0; c < cols; c++) {
      vLines.push(margin + c * (colW + gutter))            // left edge
      vLines.push(margin + c * (colW + gutter) + colW)     // right edge
    }
    // deduplicate (adjacent cols share a boundary)
    const vUniq = [...new Set(vLines)]

    const hLines: number[] = []
    for (let r = 0; r < rows; r++) {
      hLines.push(margin + r * (rowH + gutter))            // top edge
      hLines.push(margin + r * (rowH + gutter) + rowH)     // bottom edge
    }
    const hUniq = [...new Set(hLines)]

    return (
      <g data-grid pointerEvents="none">
        {vUniq.map((x, i) => (
          <line key={`v${i}`} x1={x} y1={0} x2={x} y2={canvas.h}
            stroke={palette.text} strokeOpacity={0.12} strokeWidth={1} />
        ))}
        {hUniq.map((y, i) => (
          <line key={`h${i}`} x1={0} y1={y} x2={canvas.w} y2={y}
            stroke={palette.text} strokeOpacity={0.12} strokeWidth={1} />
        ))}
      </g>
    )
  })()

  return (
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${canvas.w} ${canvas.h}`}
        width="100%" height="100%"
      >
        {/* Background — stays as sibling, not wrapped */}
        <rect data-bg x={0} y={0} width={canvas.w} height={canvas.h} fill={palette.bg} />

        {/* Defs: filters for bw and grain */}
        <defs>
          <filter id="raster-bw">
            <feColorMatrix type="saturate" values="0" />
          </filter>
          {style.filmGrain && (
            <filter id="raster-grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves={2}
                stitchTiles="stitch"
                seed={GRAIN_SEED}
              />
            </filter>
          )}
        </defs>

        {/* Slots — rendered in ascending z-order, each wrapped in <g data-slot> */}
        {orderedSlots(design).map(slot => {
          const box = slotBox(canvas, design.grid, slot)

          if (slot.role === 'image') {
            return (
              <g key={slot.id} data-slot={slot.id}>
                <SlotImage box={box} src={slot.content} bw={slot.bw ?? style.bwImage} />
              </g>
            )
          }

          if (slot.role === 'block') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            return (
              <g key={slot.id} data-slot={slot.id}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
              </g>
            )
          }

          if (slot.role === 'line') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            return (
              <g key={slot.id} data-slot={slot.id}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
              </g>
            )
          }

          // Text slot
          const resolvedText = resolveTextStyle(slot, typography)
          const cls = slot.typeClass ?? classOf(slot.role)
          const color = slot.color ??
            ((style.accentHeadline && cls === 'title') ? palette.accent : palette.text)

          return (
            <g key={slot.id} data-slot={slot.id}>
              <SlotText
                id={slot.id}
                box={box}
                text={resolvedText}
                content={slot.content}
                color={color}
                measure={m}
                imageFill={slot.imageFill}
              />
            </g>
          )
        })}

        {/* Grid overlay — above slots */}
        {gridLines}

        {/* Film grain — topmost, above everything */}
        {style.filmGrain && (
          <rect
            data-grain
            x={0} y={0} width={canvas.w} height={canvas.h}
            filter="url(#raster-grain)"
            opacity={0.12}
            style={{ mixBlendMode: 'overlay' }}
            pointerEvents="none"
          />
        )}
      </svg>
  )
}

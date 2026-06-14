import type React from 'react'
import type { Design, Slot } from '../types'
import type { Box } from '../types'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { defaultMeasurer, type Measure } from '../lib/measure'
import { classOf } from '../design/typeclass'
import { resolveTextStyle, baselineUnit } from './resolve-style'
import { SlotImage } from './slot-image'
import { SlotText } from './slot-text'
import { orderedSlots } from '../design/order'

const GRAIN_SEED = 7

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/** Build a centered SVG transform string for rotation + flip, or undefined if none needed. */
function buildTransform(box: Box, slot: Slot): string | undefined {
  const hasRotation = slot.rotation !== undefined && slot.rotation !== 0
  const hasFlipH = !!slot.flipH
  const hasFlipV = !!slot.flipV
  if (!hasRotation && !hasFlipH && !hasFlipV) return undefined

  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const parts: string[] = []

  if (hasRotation) {
    parts.push(`rotate(${slot.rotation} ${cx} ${cy})`)
  }
  if (hasFlipH) {
    // Mirror around cx: translate to place origin at cx, scale -1, translate back
    parts.push(`translate(${2 * cx} 0) scale(-1 1)`)
  }
  if (hasFlipV) {
    // Mirror around cy
    parts.push(`translate(0 ${2 * cy}) scale(1 -1)`)
  }

  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

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

    const vLines: number[] = []
    for (let c = 0; c < cols; c++) {
      vLines.push(margin + c * (colW + gutter))
      vLines.push(margin + c * (colW + gutter) + colW)
    }
    const vUniq = [...new Set(vLines)]

    const hLines: number[] = []
    for (let r = 0; r < rows; r++) {
      hLines.push(margin + r * (rowH + gutter))
      hLines.push(margin + r * (rowH + gutter) + rowH)
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

  // ---- Collect shadow filters ----
  const slotsWithShadow = orderedSlots(design).filter(s => s.shadow)

  // ---- Resolve stroke colour token ----
  function resolveStroke(stroke: string): string {
    if (stroke === 'accent') return palette.accent
    if (stroke === 'text') return palette.text
    return stroke
  }

  return (
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${canvas.w} ${canvas.h}`}
        width="100%" height="100%"
      >
        {/* Background */}
        <rect data-bg x={0} y={0} width={canvas.w} height={canvas.h} fill={palette.bg} />

        {/* Defs: bw filter, grain filter, per-slot shadow filters */}
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
          {slotsWithShadow.map(slot => {
            const sh = slot.shadow!
            return (
              <filter key={slot.id} id={`shadow-${slot.id}`}>
                <feDropShadow
                  dx={sh.dx}
                  dy={sh.dy}
                  stdDeviation={sh.blur / 2}
                  floodColor={sh.color}
                  floodOpacity={0.5}
                />
              </filter>
            )
          })}
        </defs>

        {/* Slots */}
        {orderedSlots(design).filter(s => !s.hidden).map(slot => {
          const box = slotBox(canvas, design.grid, slot)
          const transform = buildTransform(box, slot) || undefined
          const filterAttr = slot.shadow ? `url(#shadow-${slot.id})` : undefined
          const blendMode = (slot.blend && slot.blend !== 'normal')
            ? slot.blend as React.CSSProperties['mixBlendMode']
            : undefined

          if (slot.role === 'image') {
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: blendMode }}
              >
                <SlotImage
                  box={box}
                  src={slot.content}
                  bw={slot.bw ?? style.bwImage}
                  radius={slot.radius}
                  stroke={slot.stroke ? resolveStroke(slot.stroke) : undefined}
                  strokeWidth={slot.strokeWidth}
                  id={slot.id}
                />
              </g>
            )
          }

          if (slot.role === 'block') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            const rx = slot.radius ?? 0
            const strokeColor = slot.stroke ? resolveStroke(slot.stroke) : undefined
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: blendMode }}
              >
                <rect
                  x={box.x} y={box.y} width={box.w} height={box.h}
                  fill={fill}
                  rx={rx} ry={rx}
                  stroke={strokeColor}
                  strokeWidth={strokeColor ? (slot.strokeWidth ?? 2) : undefined}
                />
              </g>
            )
          }

          if (slot.role === 'line') {
            const fill = slot.fill === 'accent' ? palette.accent
              : slot.fill === 'text' ? palette.text : (slot.fill ?? palette.accent)
            return (
              <g key={slot.id} data-slot={slot.id}
                opacity={slot.opacity ?? 1}
                transform={transform}
                filter={filterAttr}
                style={{ mixBlendMode: blendMode }}
              >
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
            <g key={slot.id} data-slot={slot.id}
              opacity={slot.opacity ?? 1}
              transform={transform}
              filter={filterAttr}
              style={{ mixBlendMode: blendMode }}
            >
              <SlotText
                id={slot.id}
                box={box}
                text={resolvedText}
                content={slot.content}
                color={color}
                measure={m}
                imageFill={slot.imageFill}
                typeClass={cls}
                baseline={baselineUnit(typography)}
                textTransform={slot.textTransform}
                indent={slot.indent}
                listStyle={slot.listStyle}
              />
            </g>
          )
        })}

        {/* Grid overlay */}
        {gridLines}

        {/* Film grain */}
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

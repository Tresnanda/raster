import type { Box } from '../types'

interface SlotImageProps {
  box: Box
  src: string
  bw?: boolean
  radius?: number
  stroke?: string
  strokeWidth?: number
  /** Slot id — used to make the clipPath id unique (box-derived ids can collide
   *  when two images share identical geometry). */
  id?: string
}

export function SlotImage({ box, src, bw, radius, stroke, strokeWidth, id }: SlotImageProps) {
  if (!src) {
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const fontSize = Math.max(13, Math.min(box.w, box.h) * 0.08)
    return (
      <g data-placeholder>
        <rect
          x={box.x} y={box.y} width={box.w} height={box.h}
          fill="#9ca3af" fillOpacity={0.12}
          stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="8 6"
          rx={radius ?? 0} ry={radius ?? 0}
        />
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="'Inter', sans-serif" fontWeight={500} fontSize={fontSize}
          letterSpacing="0.04em" fill="#9ca3af"
        >
          [ Image Here ]
        </text>
      </g>
    )
  }

  const rx = radius ?? 0
  // Slot-derived clipPath id (unique per element; box-derived ids could collide
  // when two images share identical geometry). Falls back to box coords if no id.
  const clipId = `img-clip-${id ?? `${box.x}-${box.y}-${box.w}-${box.h}`}-${rx}`
  const hasClip = rx > 0
  const sw = strokeWidth ?? 2
  const strokeInset = stroke ? sw / 2 : 0

  return (
    <g>
      {hasClip && (
        <defs>
          <clipPath id={clipId}>
            <rect
              x={box.x} y={box.y} width={box.w} height={box.h}
              rx={rx} ry={rx}
            />
          </clipPath>
        </defs>
      )}
      <image
        href={src}
        x={box.x} y={box.y} width={box.w} height={box.h}
        preserveAspectRatio="xMidYMid slice"
        filter={bw ? 'url(#raster-bw)' : undefined}
        clipPath={hasClip ? `url(#${clipId})` : undefined}
      />
      {stroke && (
        <rect
          data-stroke-overlay
          x={box.x + strokeInset}
          y={box.y + strokeInset}
          width={box.w - sw}
          height={box.h - sw}
          rx={Math.max(0, rx - strokeInset)}
          ry={Math.max(0, rx - strokeInset)}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      )}
    </g>
  )
}

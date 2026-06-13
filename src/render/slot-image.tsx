import type { Box } from '../types'

export function SlotImage({ box, src, bw }: { box: Box; src: string; bw?: boolean }) {
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
  return (
    <image
      href={src} x={box.x} y={box.y} width={box.w} height={box.h}
      preserveAspectRatio="xMidYMid slice"
      filter={bw ? 'url(#raster-bw)' : undefined}
    />
  )
}

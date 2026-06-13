import type { Box } from '../types'

export function SlotImage({ box, src }: { box: Box; src: string }) {
  if (!src) {
    return <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#2a2a2a" data-placeholder />
  }
  return (
    <image
      href={src} x={box.x} y={box.y} width={box.w} height={box.h}
      preserveAspectRatio="xMidYMid slice"
    />
  )
}

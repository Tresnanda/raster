export interface Guide {
  axis: 'x' | 'y'
  pos: number
}

export function snapToGuides(value: number, guides: Guide[], threshold: number, axis?: Guide['axis']): number {
  let best = value
  let bestDistance = threshold
  for (const guide of guides) {
    if (axis && guide.axis !== axis) continue
    const distance = Math.abs(value - guide.pos)
    if (distance <= bestDistance) {
      bestDistance = distance
      best = guide.pos
    }
  }
  return best
}

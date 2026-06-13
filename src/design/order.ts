import type { Design, Slot } from '../types'

/**
 * Return slots sorted by ascending z-order.
 * Slots without a `z` field fall back to their array index.
 */
export function orderedSlots(design: Design): Slot[] {
  return [...design.slots].sort((a, b) => {
    const az = a.z ?? design.slots.indexOf(a)
    const bz = b.z ?? design.slots.indexOf(b)
    return az - bz
  })
}

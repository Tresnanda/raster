import type { Design, Slot } from '../types'
import { getArchetype } from '../archetypes'

/** Merge content from `from` into `into`: copy content for slots whose id
 *  appears in both designs. New slots in `into` keep their placeholder. */
export function mergeContent(into: Design, from: Design): Design {
  const contentMap = new Map<string, string>(from.slots.map(s => [s.id, s.content]))
  return {
    ...into,
    slots: into.slots.map(s =>
      contentMap.has(s.id) ? { ...s, content: contentMap.get(s.id)! } : s
    ),
  }
}

/** Produce a new Design with a fresh random seed and genuinely different
 *  on-grid arrangement. Picks a random variant, then optionally mirrors
 *  horizontally and applies small vertical row jitter to text slots.
 *  Preserves content, palette, typography, style, format, mode, layout. */
export function reShuffle(design: Design): Design {
  const seed = Math.floor(Math.random() * 1_000_000_000)
  const arch = getArchetype(design.archetype)
  const variantIdx = seed % arch.variants.length
  const variant = arch.variants[variantIdx]
  const COLS = design.grid.cols
  const ROWS = design.grid.rows

  // Seeded pseudo-random helpers (cheap, no import needed)
  const r1 = (seed ^ 0xdeadbeef) >>> 0
  const r2 = (seed ^ 0xbeefdead) >>> 0
  const doMirror = (r1 % 2) === 1
  const jitterSeed = r2

  let jitterCounter = 0
  function jitterFor(slotIdx: number): number {
    // Small seeded jitter: vary per slot
    const j = ((jitterSeed ^ (slotIdx * 2654435761)) >>> 0) % 5
    return (j - 2) // -2 -1 0 1 2
  }

  const slots: Slot[] = design.slots.map((s, _idx) => {
    const baseCell = variant[s.id] ?? s.cell
    let { c, cs, r, rs } = baseCell
    const align = s.text?.align ?? 'left'

    // Horizontal mirror
    let newAlign = align
    if (doMirror) {
      c = COLS - c - cs
      if (align === 'left') newAlign = 'right'
      else if (align === 'right') newAlign = 'left'
      // center stays center
    }

    // Vertical jitter for text slots (not image/block)
    const isText = s.role !== 'image' && s.role !== 'block'
    if (isText) {
      const jitter = jitterFor(jitterCounter++)
      const newR = r + jitter
      // Only apply jitter if it keeps the slot in bounds
      if (newR >= 0 && newR + rs <= ROWS) {
        r = newR
      }
    }

    // Clamp to grid bounds (safety net)
    c = Math.max(0, Math.min(c, COLS - cs))
    r = Math.max(0, Math.min(r, ROWS - rs))

    return {
      ...s,
      cell: { c, cs, r, rs },
      // Drop any free-mode absolute box so the new grid cell actually takes effect.
      box: undefined,
      text: s.text && newAlign !== align ? { ...s.text, align: newAlign } : s.text,
    }
  })

  return { ...design, seed, slots }
}

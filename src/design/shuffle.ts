import type { Design } from '../types'
import { getArchetype } from '../archetypes'
import { mulberry32 } from '../lib/rng'

/** Produce a new Design with a fresh seed and re-resolved variant cells,
 *  preserving user content + styles + palette + format + mode. */
export function reShuffle(design: Design): Design {
  const nextSeed = Math.floor(mulberry32(design.seed + 1)() * 1_000_000) + 1
  const arch = getArchetype(design.archetype)
  const variant = arch.variants[nextSeed % arch.variants.length]
  return {
    ...design,
    seed: nextSeed,
    slots: design.slots.map(s => ({ ...s, cell: variant[s.id] ?? s.cell })),
  }
}

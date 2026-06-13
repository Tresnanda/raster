import type { Design, Format } from '../types'
import { buildDesign } from './build'

export interface LayoutDef {
  n: number
  name: string
  archetype: string
  variant: number
}

export const LAYOUTS: LayoutDef[] = [
  { n: 1,  name: 'Classic',     archetype: 'editorial-grid',      variant: 0 },
  { n: 2,  name: 'Stack',       archetype: 'headline-list',       variant: 0 },
  { n: 3,  name: 'Mega',        archetype: 'mega-word',           variant: 0 },
  { n: 4,  name: 'Bleed',       archetype: 'full-bleed-corners',  variant: 0 },
  { n: 5,  name: 'Glyph',       archetype: 'glyph-frame',         variant: 0 },
  { n: 6,  name: 'Figure',      archetype: 'grid-overlay-figure', variant: 0 },
  { n: 7,  name: 'All-Type',    archetype: 'all-type',            variant: 0 },
  { n: 8,  name: 'Diptych',     archetype: 'split-diptych',       variant: 0 },
  { n: 9,  name: 'Contents',    archetype: 'index-contents',      variant: 0 },
  { n: 10, name: 'Numeral',     archetype: 'number-feature',      variant: 0 },
  { n: 11, name: 'Bento',       archetype: 'modular-bento',       variant: 0 },
  { n: 12, name: 'Rail',        archetype: 'sidebar-rail',        variant: 0 },
  { n: 13, name: 'Classic II',  archetype: 'editorial-grid',      variant: 1 },
  { n: 14, name: 'Mega II',     archetype: 'mega-word',           variant: 1 },
  { n: 15, name: 'Stack II',    archetype: 'headline-list',       variant: 1 },
  { n: 16, name: 'Diptych II',  archetype: 'split-diptych',       variant: 1 },
  { n: 17, name: 'Bento II',    archetype: 'modular-bento',       variant: 1 },
  { n: 18, name: 'Numeral II',  archetype: 'number-feature',      variant: 1 },
  { n: 19, name: 'Rail II',     archetype: 'sidebar-rail',        variant: 1 },
]

/** Build a Design for the given layout number (1-based) and format.
 *  The variant from LAYOUTS is used as the seed so buildDesign selects
 *  the correct variant (seed % variants.length). */
export function buildFromLayout(n: number, format: Format): Design {
  if (n < 1 || n > LAYOUTS.length) {
    throw new Error(`Layout n=${n} out of range (1–${LAYOUTS.length})`)
  }
  const def = LAYOUTS[n - 1]
  const design = buildDesign(def.archetype, format, def.variant)
  return { ...design, layout: n }
}

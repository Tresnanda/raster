import type { Design, Format, Palette, Slot, TextStyle } from '../types'
import { getArchetype } from '../archetypes'
import { defaultGrid } from './formats'

const DEFAULT_TEXT: TextStyle = {
  family: 'sans', weight: 700, size: 48, tracking: 0, leading: 1, align: 'left', fit: 'fixed',
}

const DARK: Palette = { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' }
const LIGHT: Palette = { bg: '#e8e6e1', text: '#111111', accent: '#d6231f' }

export function buildDesign(archetypeId: string, format: Format, seed: number): Design {
  const arch = getArchetype(archetypeId)
  const variant = arch.variants[seed % arch.variants.length]
  const slots: Slot[] = arch.slots.map(def => {
    const isText = def.role !== 'image'
    return {
      id: def.id,
      role: def.role,
      cell: variant[def.id],
      content: def.placeholder,
      text: isText ? { ...DEFAULT_TEXT, ...def.text } : undefined,
    }
  })
  return {
    format,
    grid: defaultGrid(),
    archetype: archetypeId,
    palette: arch.ground === 'dark' ? { ...DARK } : { ...LIGHT },
    seed,
    mode: 'grid',
    slots,
  }
}

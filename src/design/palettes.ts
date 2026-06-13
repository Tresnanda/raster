import type { Palette } from '../types'

export const PRESET_PALETTES: { name: string; palette: Palette }[] = [
  { name: 'Black / White', palette: { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' } },
  { name: 'Red / Black', palette: { bg: '#0a0a0a', text: '#ffffff', accent: '#d6231f' } },
  { name: 'Off-white / Charcoal', palette: { bg: '#e8e6e1', text: '#111111', accent: '#d6231f' } },
  { name: 'Paper / Ink', palette: { bg: '#f4f1ea', text: '#1a1a1a', accent: '#1d4ed8' } },
  { name: 'Mono Invert', palette: { bg: '#ffffff', text: '#000000', accent: '#000000' } },
]

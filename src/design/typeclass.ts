import type { SlotRole, Typography, StyleOptions } from '../types'

export function classOf(role: SlotRole): 'title' | 'headline' | 'body' {
  if (role === 'headline') return 'title'
  if (role === 'date' || role === 'glyph') return 'headline'
  return 'body'
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  typeface: 'display',
  title: 120,
  headline: 220,
  body: 18,
  tracking: -0.02,
  leading: 0.92,
}

export const DEFAULT_STYLE: StyleOptions = {
  accentHeadline: false,
  bwImage: true,
  filmGrain: true,
  gridOverlay: false,
}

import type { Design, Slot, Typography, StyleOptions } from '../types'
import { PRESET_PALETTES } from './palettes'
import { generate } from './generate'
import { reShuffle } from './shuffle'

// ---------------------------------------------------------------------------
// Probability helper
// ---------------------------------------------------------------------------
function maybe(prob: number): boolean {
  return Math.random() < prob
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Clamp helpers
// ---------------------------------------------------------------------------
function clampBetween(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ---------------------------------------------------------------------------
// Palette mutation
// ---------------------------------------------------------------------------
function mutatePalette(design: Design, strength: number): Design['palette'] {
  const { palette } = design

  // High strength: sometimes swap to a completely different preset
  if (maybe(strength * 0.5)) {
    const preset = pick(PRESET_PALETTES)
    return { ...preset.palette }
  }

  // Medium: invert bg/text (dark↔light) by picking a preset with opposite bg luminance
  if (maybe(strength * 0.3)) {
    // Determine if current bg is dark or light by naive char check
    const isDark = palette.bg < '#888888'
    const candidates = PRESET_PALETTES.filter(p => {
      const pDark = p.palette.bg < '#888888'
      return pDark !== isDark
    })
    if (candidates.length > 0) {
      return { ...pick(candidates).palette }
    }
  }

  // Low: just rotate the accent to a random preset's accent
  if (maybe(strength * 0.6)) {
    const accentPreset = pick(PRESET_PALETTES)
    return { ...palette, accent: accentPreset.palette.accent }
  }

  return palette
}

// ---------------------------------------------------------------------------
// Typography mutation
// ---------------------------------------------------------------------------
function mutateTypography(typography: Typography, strength: number): Typography {
  const jitter = (v: number, maxRel: number, lo: number, hi: number): number => {
    const delta = (Math.random() * 2 - 1) * v * maxRel * strength
    return clampBetween(Math.round(v + delta), lo, hi)
  }
  const jitterTracking = (v: number): number => {
    const delta = (Math.random() * 2 - 1) * 0.03 * strength
    return clampBetween(v + delta, -0.08, 0.1)
  }

  return {
    ...typography,
    title:    jitter(typography.title,    0.35, 60,  300),
    headline: jitter(typography.headline, 0.35, 80,  400),
    body:     jitter(typography.body,     0.35, 12,  30),
    tracking: jitterTracking(typography.tracking),
  }
}

// ---------------------------------------------------------------------------
// Style mutation
// ---------------------------------------------------------------------------
function mutateStyle(style: StyleOptions, strength: number): StyleOptions {
  // Each flag: probability of toggling = strength * 0.5
  const toggle = (v: boolean): boolean => maybe(strength * 0.5) ? !v : v
  return {
    accentHeadline: toggle(style.accentHeadline),
    bwImage:        toggle(style.bwImage),
    filmGrain:      toggle(style.filmGrain),
    gridOverlay:    toggle(style.gridOverlay),
  }
}

// ---------------------------------------------------------------------------
// Slot arrangement mutation
// ---------------------------------------------------------------------------
function mutateArrangement(design: Design, strength: number): Slot[] {
  // reShuffle requires a known archetype — generated designs don't have one
  if (design.archetype === 'generated') return design.slots

  // With probability ∝ strength, reShuffle the arrangement
  if (maybe(strength * 0.7)) {
    const reshuffled = reShuffle(design)
    return reshuffled.slots
  }
  return design.slots
}

// ---------------------------------------------------------------------------
// Content preservation: when we use a fresh generate(), map content by slot id
// ---------------------------------------------------------------------------
function mapContentBySlotId(intoSlots: Slot[], fromSlots: Slot[]): Slot[] {
  const contentMap = new Map<string, string>(fromSlots.map(s => [s.id, s.content]))
  return intoSlots.map(s =>
    contentMap.has(s.id) ? { ...s, content: contentMap.get(s.id)! } : s
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Produce a mutated variation of `design`.
 * strength: 0 (subtle) to 1 (wild).
 *
 * Always preserves:
 *  - slot content (by id, or best-effort when layout changes)
 *  - format + grid
 *
 * At low strength: only palette accent + slight typography jitter.
 * At high strength: can swap layout entirely or generate fresh structure.
 */
export function mutate(design: Design, strength: number): Design {
  const s = clampBetween(strength, 0, 1)

  // --- 1. Decide how radical to be ---
  const radical = maybe(s * 0.25) // chance of total layout replacement

  if (radical) {
    // Generate a brand-new design structure, map content over by slot id, keep palette/typo
    const fresh = generate(design.format)
    const mappedSlots = mapContentBySlotId(fresh.slots, design.slots)
    return {
      ...fresh,
      slots: mappedSlots,
      palette:    mutatePalette(design, s),
      typography: mutateTypography(design.typography, s),
      style:      mutateStyle(design.style, s),
    }
  }

  // --- 2. Mutate in-place ---
  const palette    = mutatePalette(design, s)
  const typography = mutateTypography(design.typography, s)
  const style      = mutateStyle(design.style, s)
  const slots      = mutateArrangement(design, s)

  return {
    ...design,
    palette,
    typography,
    style,
    slots,
    // Update seed so each mutation has a unique identity
    seed: Math.floor(Math.random() * 1_000_000_000),
  }
}

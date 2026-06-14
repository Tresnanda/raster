import type { Slot, TextStyle, Typography } from '../types'
import { classOf } from '../design/typeclass'

/**
 * Compute the baseline grid unit from global typography.
 * All text blocks snap their per-line advance to multiples of this value,
 * so display and body elements share a common vertical rhythm.
 *
 * Formula: round(body * 1.4) — with body=18 this gives 25 px.
 */
export function baselineUnit(typography: Typography): number {
  return Math.round(typography.body * 1.4)
}

/**
 * Compute the effective TextStyle for a text slot by applying typography
 * class overrides from the design's Typography settings.
 *
 * Global typography governs:
 *   - All classes: `size`
 *   - title/headline classes only: `family`, `tracking`, `leading`
 *
 * A field is NOT overridden by global typography when its name appears in
 * `slot.overridden` — in that case the slot's own text value wins.
 *
 * Fields never globally governed (always per-slot): `weight`, `align`, `fit`.
 * For body class: `family`, `tracking`, `leading` are also always per-slot.
 */
export function resolveTextStyle(slot: Slot, typography: Typography): TextStyle {
  const base = slot.text!
  const cls = slot.typeClass ?? classOf(slot.role)
  const ov = slot.overridden ?? []

  function pick<K extends keyof TextStyle>(
    field: K,
    globalValue: TextStyle[K],
  ): TextStyle[K] {
    return ov.includes(field) ? base[field] : globalValue
  }

  if (cls === 'title' || cls === 'headline') {
    return {
      ...base,
      size: pick('size', typography[cls] as number),
      family: pick('family', typography.typeface),
      tracking: pick('tracking', typography.tracking),
      leading: pick('leading', typography.leading),
    }
  }

  // body — only size is globally governed
  return {
    ...base,
    size: pick('size', typography.body),
  }
}

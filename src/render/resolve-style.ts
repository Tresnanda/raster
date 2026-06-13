import type { Slot, TextStyle, Typography } from '../types'
import { classOf } from '../design/typeclass'

/**
 * Compute the effective TextStyle for a text slot by applying typography
 * class overrides from the design's Typography settings.
 *
 * - Size is always overridden to `typography[cls]`.
 * - For title and headline classes: family, tracking, and leading are also
 *   overridden with the global typography values.
 * - Body class keeps the slot's own family, tracking, and leading.
 */
export function resolveTextStyle(slot: Slot, typography: Typography): TextStyle {
  const base = slot.text!
  const cls = slot.typeClass ?? classOf(slot.role)

  if (cls === 'title' || cls === 'headline') {
    return {
      ...base,
      size: typography[cls],
      family: typography.typeface,
      tracking: typography.tracking,
      leading: typography.leading,
    }
  }

  // body — only override size
  return {
    ...base,
    size: typography.body,
  }
}

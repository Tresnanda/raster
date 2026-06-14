import type { Design, FontFamily, Slot, TextStyle, Typography } from '../types'
import { classOf } from './typeclass'

export interface TypeSystem extends Typography {
  id: string
  name: string
}

export const TYPE_SYSTEMS: TypeSystem[] = [
  {
    id: 'grotesk-monument',
    name: 'Grotesk Monument',
    typeface: 'display',
    title: 168,
    headline: 74,
    body: 18,
    tracking: -0.035,
    leading: 0.88,
  },
  {
    id: 'editorial-contrast',
    name: 'Editorial Contrast',
    typeface: 'sans',
    title: 142,
    headline: 62,
    body: 20,
    tracking: -0.012,
    leading: 1.02,
  },
  {
    id: 'mono-technical',
    name: 'Mono Technical',
    typeface: 'mono',
    title: 132,
    headline: 56,
    body: 16,
    tracking: -0.01,
    leading: 1.05,
  },
  {
    id: 'condensed-sport',
    name: 'Condensed Sport',
    typeface: 'condensed',
    title: 190,
    headline: 82,
    body: 18,
    tracking: -0.045,
    leading: 0.84,
  },
  {
    id: 'neue-quiet',
    name: 'Neue Quiet',
    typeface: 'sans',
    title: 118,
    headline: 48,
    body: 17,
    tracking: 0,
    leading: 1.18,
  },
  {
    id: 'index-rail',
    name: 'Index Rail',
    typeface: 'mono',
    title: 104,
    headline: 42,
    body: 14,
    tracking: 0.012,
    leading: 1.26,
  },
  {
    id: 'poster-grotesk',
    name: 'Poster Grotesk',
    typeface: 'display',
    title: 210,
    headline: 88,
    body: 19,
    tracking: -0.055,
    leading: 0.82,
  },
]

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function systemTypography(system: TypeSystem): Typography {
  return {
    typeface: system.typeface,
    title: system.title,
    headline: system.headline,
    body: system.body,
    tracking: system.tracking,
    leading: system.leading,
  }
}

function pickTextField<K extends keyof TextStyle>(
  slot: Slot,
  field: K,
  nextValue: TextStyle[K],
): TextStyle[K] {
  return (slot.overridden ?? []).includes(field) ? slot.text![field] : nextValue
}

function classSize(cls: ReturnType<typeof classOf>, typography: Typography): number {
  if (cls === 'title') return typography.title
  if (cls === 'headline') return typography.headline
  return typography.body
}

function applyTypeToSlot(slot: Slot, typography: Typography, typeface: FontFamily): Slot {
  if (!slot.text) return slot
  const cls = slot.typeClass ?? classOf(slot.role)
  return {
    ...slot,
    text: {
      ...slot.text,
      size: pickTextField(slot, 'size', classSize(cls, typography)),
      family: pickTextField(slot, 'family', typeface),
      tracking: pickTextField(slot, 'tracking', typography.tracking),
      leading: pickTextField(slot, 'leading', cls === 'body' ? Math.max(1, typography.leading + 0.16) : typography.leading),
    },
  }
}

export function applyTypeSystem(design: Design, id: string): Design {
  const system = TYPE_SYSTEMS.find(item => item.id === id)
  if (!system) return design
  const typography = systemTypography(system)
  return {
    ...design,
    typography,
    slots: clone(design.slots).map(slot => applyTypeToSlot(slot, typography, system.typeface)),
  }
}

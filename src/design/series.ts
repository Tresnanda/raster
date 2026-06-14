import type { Design, Slot } from '../types'

export interface CampaignItem {
  id: string
  title: string
  design: Design
  createdAt: string
  updatedAt: string
}

function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design
}

/** Find the dominant text slot — the one whose content a series item replaces.
 *  Prefers a 'title' typeClass; falls back to the largest-size text slot. */
export function dominantTextSlot(design: Design): Slot | undefined {
  const textSlots = design.slots.filter(s => s.text)
  const titles = textSlots.filter(s => (s.typeClass ?? '') === 'title')
  const pool = titles.length ? titles : textSlots
  return [...pool].sort((a, b) => (b.text!.size ?? 0) - (a.text!.size ?? 0))[0]
}

/** Parse a pasted block into series items (one per non-empty line). */
export function parseSeriesItems(raw: string): string[] {
  return raw.split('\n').map(l => l.trim()).filter(Boolean)
}

/**
 * Build a matched SET of designs from a template: every item reuses the exact same
 * system (layout, palette, type, style, image), with the dominant text swapped to
 * that item. A festival lineup or a content series in one coherent look.
 */
export function buildSeries(template: Design, items: string[]): Design[] {
  const target = dominantTextSlot(template)
  return items.map((item, i) => ({
    ...template,
    seed: (template.seed ?? 0) + i + 1,
    slots: template.slots.map(s =>
      target && s.id === target.id ? { ...s, content: item } : s,
    ),
  }))
}

export function buildCampaignItems(template: Design, items: string[], now = new Date().toISOString()): CampaignItem[] {
  return buildSeries(template, items).map((design, index) => ({
    id: `campaign-${index + 1}`,
    title: items[index],
    design: cloneDesign(design),
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateCampaignItemTitle(items: CampaignItem[], id: string, title: string, now = new Date().toISOString()): CampaignItem[] {
  return items.map(item => {
    if (item.id !== id) return item
    const target = dominantTextSlot(item.design)
    return {
      ...item,
      title,
      updatedAt: now,
      design: {
        ...item.design,
        slots: item.design.slots.map(slot =>
          target && slot.id === target.id ? { ...slot, content: title } : slot,
        ),
      },
    }
  })
}

import type { Design, GridCell, Slot } from '../types'

export const COMPONENTS_KEY = 'raster:components'
const COMPONENT_LIMIT = 40

export interface SavedComponent {
  id: string
  name: string
  createdAt: string
  slots: Slot[]
}

interface CreateSavedComponentOptions {
  id?: string
  name?: string
  now?: string
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createId(): string {
  return `component-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function cleanName(name?: string): string {
  const cleaned = (name ?? '').trim().replace(/\s+/g, ' ')
  return cleaned || 'Untitled Component'
}

function stripImageBytes(slot: Slot): Slot {
  if (slot.role !== 'image') return slot
  const isDataUrl = (value?: string) => !!value && value.startsWith('data:')
  return {
    ...slot,
    content: isDataUrl(slot.content) ? '' : slot.content,
    imageSrcOriginal: isDataUrl(slot.imageSrcOriginal) ? undefined : slot.imageSrcOriginal,
  }
}

function selectedSlots(design: Design, ids: string[]): Slot[] {
  const selected = new Set(ids)
  return design.slots.filter(slot => selected.has(slot.id)).map(slot => stripImageBytes(clone(slot)))
}

function groupOrigin(slots: Slot[]): { c: number; r: number } {
  return slots.reduce(
    (origin, slot) => ({
      c: Math.min(origin.c, slot.cell.c),
      r: Math.min(origin.r, slot.cell.r),
    }),
    { c: Number.POSITIVE_INFINITY, r: Number.POSITIVE_INFINITY },
  )
}

function clampCell(cell: GridCell, cols: number, rows: number): GridCell {
  const cs = Math.max(1, Math.min(cell.cs, cols))
  const rs = Math.max(1, Math.min(cell.rs, rows))
  return {
    c: Math.max(0, Math.min(cell.c, cols - cs)),
    cs,
    r: Math.max(0, Math.min(cell.r, rows - rs)),
    rs,
  }
}

export function createSavedComponent(
  design: Design,
  ids: string[],
  opts: CreateSavedComponentOptions = {},
): SavedComponent {
  const slots = selectedSlots(design, ids)
  const origin = groupOrigin(slots)
  const normalized = slots.map(slot => ({
    ...slot,
    box: undefined,
    cell: {
      ...slot.cell,
      c: slot.cell.c - origin.c,
      r: slot.cell.r - origin.r,
    },
  }))
  return {
    id: opts.id ?? createId(),
    name: cleanName(opts.name),
    createdAt: opts.now ?? new Date().toISOString(),
    slots: normalized,
  }
}

export function insertSavedComponent(design: Design, component: SavedComponent, atCell: Pick<GridCell, 'c' | 'r'> = { c: 0, r: 0 }): Design {
  const maxZ = design.slots.reduce((max, slot, index) => Math.max(max, slot.z ?? index), -1)
  const inserted = component.slots.map((slot, index) => ({
    ...clone(slot),
    id: `${component.id}-${Date.now()}-${index}`,
    z: maxZ + index + 1,
    cell: clampCell({
      ...slot.cell,
      c: atCell.c + slot.cell.c,
      r: atCell.r + slot.cell.r,
    }, design.grid.cols, design.grid.rows),
  }))
  return {
    ...design,
    slots: [...design.slots, ...inserted],
  }
}

export function readSavedComponents(): SavedComponent[] {
  try {
    const raw = localStorage.getItem(COMPONENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as SavedComponent[] : []
  } catch {
    return []
  }
}

export function writeSavedComponents(components: SavedComponent[]): boolean {
  try {
    localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components.slice(0, COMPONENT_LIMIT)))
    return true
  } catch {
    return false
  }
}

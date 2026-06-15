import type { Box, Design, Grid, GridCell, Slot } from '../types'
import { resolveCell } from '../lib/grid'
import { applyCoachFix, contrastRatio } from './grid-coach'
import { canvasFor } from './formats'
import { classOf } from './typeclass'
import { OccupancyGrid, cellsIntersect, resolveTextCollisions } from './generate'

const TEXT_ROLES = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])

function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.max(min, Math.min(max, value))
}

function clampCell(cell: GridCell, cols: number, rows: number): GridCell {
  const cs = clamp(Math.round(cell.cs), 1, cols)
  const rs = clamp(Math.round(cell.rs), 1, rows)
  return {
    c: clamp(Math.round(cell.c), 0, cols - cs),
    cs,
    r: clamp(Math.round(cell.r), 0, rows - rs),
    rs,
  }
}

function cellFromBox(box: Box, grid: Grid, canvas: { w: number; h: number }): GridCell {
  const colW = (canvas.w - 2 * grid.margin - (grid.cols - 1) * grid.gutter) / grid.cols
  const rowH = (canvas.h - 2 * grid.margin - (grid.rows - 1) * grid.gutter) / grid.rows
  const colPitch = colW + grid.gutter
  const rowPitch = rowH + grid.gutter
  const cs = Math.max(1, Math.round((box.w + grid.gutter) / colPitch))
  const rs = Math.max(1, Math.round((box.h + grid.gutter) / rowPitch))
  const c = Math.round((box.x - grid.margin) / colPitch)
  const r = Math.round((box.y - grid.margin) / rowPitch)
  return clampCell({ c, cs, r, rs }, grid.cols, grid.rows)
}

function textPriority(slot: Slot): number {
  if (slot.text && slot.typeClass === 'title') return 0
  if (slot.text) return 1
  return 2
}

function normalizedSlots(design: Design): Slot[] {
  const canvas = canvasFor(design.format)
  return design.slots.map(slot => {
    const cell = slot.box
      ? cellFromBox(slot.box, design.grid, canvas)
      : clampCell(slot.cell, design.grid.cols, design.grid.rows)
    const { box: _box, ...rest } = slot
    return { ...rest, cell }
  })
}

function resolvedSize(design: Design, slot: Slot): number {
  if (!slot.text) return 0
  const cls = slot.typeClass ?? classOf(slot.role)
  if ((slot.overridden ?? []).includes('size')) return slot.text.size
  if (cls === 'title') return design.typography.title
  if (cls === 'headline') return design.typography.headline
  return design.typography.body
}

function chooseDominantId(design: Design, slots: Slot[]): string | null {
  const textSlots = slots.filter(slot => slot.text && !slot.hidden)
  if (textSlots.length === 0) return null
  const ranked = [...textSlots].sort((a, b) => {
    const aTitle = a.typeClass === 'title' ? 1 : 0
    const bTitle = b.typeClass === 'title' ? 1 : 0
    if (aTitle !== bTitle) return bTitle - aTitle
    const sizeDelta = resolvedSize(design, b) - resolvedSize(design, a)
    if (sizeDelta !== 0) return sizeDelta
    return (b.z ?? 0) - (a.z ?? 0)
  })
  return ranked[0].id
}

function retagHierarchy(design: Design, slots: Slot[]): { typography: Design['typography']; slots: Slot[] } {
  const dominantId = chooseDominantId(design, slots)
  if (!dominantId) return { typography: design.typography, slots }

  const dominant = slots.find(slot => slot.id === dominantId)!
  const supportSizes = slots
    .filter(slot => slot.text && slot.id !== dominantId && !slot.hidden)
    .map(slot => resolvedSize(design, slot))
  const supportMax = supportSizes.length ? Math.max(...supportSizes) : design.typography.body
  const title = Math.max(resolvedSize(design, dominant), Math.ceil(supportMax * 2.1), 72)
  const headline = Math.min(Math.max(48, Math.round(title * 0.46)), Math.max(48, title - 12))
  const body = Math.min(Math.max(14, design.typography.body), Math.max(14, Math.floor(title / 3)))

  const typography = {
    ...design.typography,
    title,
    headline,
    body,
  }

  return {
    typography,
    slots: slots.map(slot => {
      if (!slot.text) return slot
      if (slot.id === dominantId) {
        return {
          ...slot,
          typeClass: 'title',
          text: {
            ...slot.text,
            align: 'left',
            weight: Math.max(slot.text.weight, 800),
            fit: 'auto',
          },
        }
      }
      const nextClass = slot.role === 'date' || slot.role === 'glyph' ? 'headline' : 'body'
      return {
        ...slot,
        typeClass: nextClass,
        text: {
          ...slot.text,
          align: slot.text.align === 'center' ? 'left' : slot.text.align,
        },
      }
    }),
  }
}

function candidateCells(slot: Slot, cols: number, rows: number): GridCell[] {
  const base = clampCell(slot.cell, cols, rows)
  const sizes: Array<[number, number]> = [
    [base.cs, base.rs],
    [Math.min(base.cs, 6), Math.min(base.rs, 2)],
    [Math.min(base.cs, 4), 1],
  ]
  const starts = [
    [base.c, base.r],
    [0, 0],
    [cols - base.cs, 0],
    [0, rows - base.rs],
    [cols - base.cs, rows - base.rs],
    [0, Math.floor(rows * 0.35)],
    [cols - base.cs, Math.floor(rows * 0.55)],
  ]
  const cells: GridCell[] = []
  for (const [cs, rs] of sizes) {
    for (const [c, r] of starts) {
      cells.push(clampCell({ c, cs, r, rs }, cols, rows))
    }
    for (let r = 0; r < rows; r += Math.max(1, rs)) {
      for (let c = 0; c < cols; c += Math.max(1, cs)) {
        cells.push(clampCell({ c, cs, r, rs }, cols, rows))
      }
    }
  }
  return cells
}

function resolveTextWithoutDropping(slots: Slot[], cols: number, rows: number): Slot[] {
  const byId = new Map<string, Slot>()
  const ordered = [...slots].sort((a, b) => {
    const priority = textPriority(a) - textPriority(b)
    if (priority !== 0) return priority
    return (b.z ?? 0) - (a.z ?? 0)
  })
  const keptText: Slot[] = []

  for (const slot of ordered) {
    if (!slot.text || !TEXT_ROLES.has(slot.role) || slot.hidden) {
      byId.set(slot.id, slot)
      continue
    }

    const collides = (cell: GridCell) => keptText.some(kept => cellsIntersect(kept.cell, cell))
    let next = { ...slot, cell: clampCell(slot.cell, cols, rows) }
    if (collides(next.cell)) {
      const found = candidateCells(slot, cols, rows).find(cell => !collides(cell))
      if (found) next = { ...next, cell: found }
    }
    keptText.push(next)
    byId.set(slot.id, next)
  }

  return slots.map(slot => byId.get(slot.id) ?? slot)
}

function avoidDeadCenterTitle(slots: Slot[], cols: number, rows: number): Slot[] {
  return slots.map(slot => {
    if (!slot.text || slot.typeClass !== 'title') return slot
    const centerX = slot.cell.c + slot.cell.cs / 2
    const centerY = slot.cell.r + slot.cell.rs / 2
    const tooCenteredX = centerX > cols * 0.34 && centerX < cols * 0.66
    const tooCenteredY = centerY > rows * 0.34 && centerY < rows * 0.66
    if (!tooCenteredX && !tooCenteredY) return slot
    return {
      ...slot,
      cell: clampCell({
        ...slot.cell,
        c: centerX >= cols / 2 ? cols - slot.cell.cs : 0,
        r: centerY >= rows / 2 ? rows - slot.cell.rs - 1 : 1,
      }, cols, rows),
    }
  })
}

function compactDenseText(slots: Slot[], cols: number, rows: number): Slot[] {
  const occ = new OccupancyGrid(cols, rows)
  for (const slot of slots) {
    if (slot.hidden || slot.role === 'image' || slot.role === 'line') continue
    occ.claim(slot.cell)
  }
  if (occ.occupiedCount() / (cols * rows) <= 0.7) return slots

  return slots.map(slot => {
    if (!slot.text) return slot
    const title = slot.typeClass === 'title'
    return {
      ...slot,
      cell: clampCell({
        ...slot.cell,
        cs: Math.min(slot.cell.cs, title ? 9 : 4),
        rs: Math.min(slot.cell.rs, title ? 4 : 2),
      }, cols, rows),
    }
  })
}

function lineUpWithGrid(design: Design, slots: Slot[]): Slot[] {
  const canvas = canvasFor(design.format)
  return slots.map(slot => {
    const box = resolveCell(canvas, design.grid, slot.cell)
    if (!slot.text || slot.typeClass !== 'title') return slot
    const minTitleHeight = Math.max(1, Math.round(design.typography.title * 1.3))
    if (box.h >= minTitleHeight) return slot
    const rowBox = resolveCell(canvas, design.grid, { ...slot.cell, rs: 1 })
    const extraRows = Math.ceil((minTitleHeight - box.h) / Math.max(1, rowBox.h + design.grid.gutter))
    return {
      ...slot,
      cell: clampCell({ ...slot.cell, rs: slot.cell.rs + extraRows }, design.grid.cols, design.grid.rows),
    }
  })
}

export function tidy(design: Design): Design {
  const cloned = cloneDesign(design)
  const normalized = normalizedSlots(cloned)
  const hierarchy = retagHierarchy(cloned, normalized)
  let next: Design = {
    ...cloned,
    typography: hierarchy.typography,
    slots: hierarchy.slots,
  }

  const sortedForGenerator = [...next.slots].sort((a, b) => {
    const priority = textPriority(a) - textPriority(b)
    if (priority !== 0) return priority
    return (b.z ?? 0) - (a.z ?? 0)
  })
  const generatorResolved = resolveTextCollisions(sortedForGenerator, next.grid.cols, next.grid.rows)
  const byId = new Map(generatorResolved.map(slot => [slot.id, slot]))
  next = {
    ...next,
    slots: next.slots.map(slot => byId.get(slot.id) ?? slot),
  }

  next = {
    ...next,
    slots: resolveTextWithoutDropping(next.slots, next.grid.cols, next.grid.rows),
  }
  next = {
    ...next,
    slots: compactDenseText(next.slots, next.grid.cols, next.grid.rows),
  }
  next = {
    ...next,
    slots: avoidDeadCenterTitle(next.slots, next.grid.cols, next.grid.rows),
  }
  next = {
    ...next,
    slots: lineUpWithGrid(next, next.slots),
  }
  next = {
    ...next,
    slots: resolveTextWithoutDropping(next.slots, next.grid.cols, next.grid.rows),
  }

  if (contrastRatio(next.palette.bg, next.palette.text) < 4.5) {
    next = applyCoachFix(next, 'increase-contrast')
  }

  return next
}

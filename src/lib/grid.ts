import type { Box, Canvas, Grid, GridCell } from '../types'

export function resolveCell(canvas: Canvas, grid: Grid, cell: GridCell): Box {
  const { cols, rows, margin, gutter } = grid
  const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
  const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows
  return {
    x: margin + cell.c * (colW + gutter),
    y: margin + cell.r * (rowH + gutter),
    w: cell.cs * colW + (cell.cs - 1) * gutter,
    h: cell.rs * rowH + (cell.rs - 1) * gutter,
  }
}

/** Geometry for a slot: free-mode box wins, else resolve its grid cell. */
export function slotBox(canvas: Canvas, grid: Grid, slot: { cell: GridCell; box?: Box }): Box {
  return slot.box ?? resolveCell(canvas, grid, slot.cell)
}

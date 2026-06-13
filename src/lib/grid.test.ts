import { expect, test } from 'vitest'
import { resolveCell } from './grid'
import type { Canvas, Grid, GridCell } from '../types'

const canvas: Canvas = { w: 1080, h: 1080 }
const grid: Grid = { cols: 12, rows: 12, margin: 60, gutter: 20 }

test('full-span cell fills the content area', () => {
  const cell: GridCell = { c: 0, cs: 12, r: 0, rs: 12 }
  const box = resolveCell(canvas, grid, cell)
  expect(box.x).toBe(60)
  expect(box.y).toBe(60)
  expect(box.w).toBeCloseTo(1080 - 120) // 960
  expect(box.h).toBeCloseTo(1080 - 120)
})

test('single cell places at correct offset', () => {
  // colWidth = (1080-120-11*20)/12 = (960-220)/12 = 61.666..
  const box = resolveCell(canvas, grid, { c: 1, cs: 1, r: 0, rs: 1 })
  const colW = (1080 - 120 - 11 * 20) / 12
  expect(box.x).toBeCloseTo(60 + 1 * (colW + 20))
  expect(box.w).toBeCloseTo(colW)
})

test('multi-cell span includes inner gutters', () => {
  const box = resolveCell(canvas, grid, { c: 0, cs: 3, r: 0, rs: 1 })
  const colW = (1080 - 120 - 11 * 20) / 12
  expect(box.w).toBeCloseTo(3 * colW + 2 * 20)
})

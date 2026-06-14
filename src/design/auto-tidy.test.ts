import { expect, test } from 'vitest'
import { generate, cellsIntersect } from './generate'
import { tidy } from './auto-tidy'
import { contrastRatio } from './grid-coach'
import type { Design, GridCell } from '../types'

const COLS = 12
const ROWS = 16
const TEXT_ROLES = new Set(['headline', 'subhead', 'caption', 'date', 'index', 'glyph', 'mark'])

function cellInBounds(cell: GridCell): boolean {
  return (
    cell.c >= 0 && cell.c < COLS &&
    cell.cs >= 1 && cell.c + cell.cs <= COLS &&
    cell.r >= 0 && cell.r < ROWS &&
    cell.rs >= 1 && cell.r + cell.rs <= ROWS
  )
}

function textOverlapCount(design: Design): number {
  const textSlots = design.slots.filter(slot => TEXT_ROLES.has(slot.role) && !slot.hidden)
  let overlaps = 0
  for (let i = 0; i < textSlots.length; i++) {
    for (let j = i + 1; j < textSlots.length; j++) {
      if (cellsIntersect(textSlots[i].cell, textSlots[j].cell)) overlaps += 1
    }
  }
  return overlaps
}

function occupiedFraction(design: Design): number {
  const cells = new Set<string>()
  for (const slot of design.slots) {
    if (slot.hidden || slot.role === 'image' || slot.role === 'line') continue
    for (let r = slot.cell.r; r < slot.cell.r + slot.cell.rs; r++) {
      for (let c = slot.cell.c; c < slot.cell.c + slot.cell.cs; c++) {
        cells.add(`${r},${c}`)
      }
    }
  }
  return cells.size / (COLS * ROWS)
}

function messyDesign(): Design {
  const design = generate('3:4', { seed: 42069, candidateCount: 12 })
  const textSlots = design.slots.filter(slot => slot.text)
  const textIds = new Set(textSlots.map(slot => slot.id))
  let textIndex = 0

  return {
    ...design,
    palette: { bg: '#f5f3ee', text: '#e9e5dc', accent: '#2354d8' },
    slots: design.slots.map(slot => {
      if (!textIds.has(slot.id)) return slot
      const next = {
        ...slot,
        cell: { c: 4, cs: 7, r: 7, rs: 3 },
        box: {
          x: 612 + textIndex * 18,
          y: 532 + textIndex * 11,
          w: 450,
          h: 160,
        },
        text: slot.text ? { ...slot.text, size: textIndex === 0 ? 96 : 88, align: 'center' as const } : slot.text,
        typeClass: 'title' as const,
      }
      textIndex += 1
      return next
    }),
  }
}

function slotSignature(design: Design): string[] {
  return design.slots.map(slot => `${slot.id}:${slot.role}:${slot.content}`).sort()
}

test('tidy is idempotent after it snaps and rebalances a messy poster', () => {
  const once = tidy(messyDesign())
  const twice = tidy(once)
  expect(twice).toEqual(once)
})

test('tidy preserves ids, roles, content, and image payloads', () => {
  const messy = messyDesign()
  const tidied = tidy(messy)

  expect(slotSignature(tidied)).toEqual(slotSignature(messy))
})

test('tidy removes free boxes and restores grid-safe Swiss invariants', () => {
  const tidied = tidy(messyDesign())
  const titles = tidied.slots.filter(slot => slot.text && slot.typeClass === 'title')

  expect(tidied.slots.every(slot => !slot.box)).toBe(true)
  expect(tidied.slots.every(slot => cellInBounds(slot.cell))).toBe(true)
  expect(textOverlapCount(tidied)).toBe(0)
  expect(occupiedFraction(tidied)).toBeLessThanOrEqual(0.7)
  expect(titles).toHaveLength(1)
  expect(contrastRatio(tidied.palette.bg, tidied.palette.text)).toBeGreaterThanOrEqual(4.5)
})

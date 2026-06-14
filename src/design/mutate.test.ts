import { expect, test, describe } from 'vitest'
import { mutate } from './mutate'
import { generate } from './generate'
import type { Design, GridCell } from '../types'

const COLS = 12
const ROWS = 16
const VALID_HEX = /^#[0-9a-fA-F]{6}$/

function cellInBounds(cell: GridCell): boolean {
  return (
    cell.c >= 0 && cell.c < COLS &&
    cell.cs >= 1 && cell.c + cell.cs <= COLS &&
    cell.r >= 0 && cell.r < ROWS &&
    cell.rs >= 1 && cell.r + cell.rs <= ROWS
  )
}

function checkDesignValid(d: Design) {
  // palette valid
  expect(d.palette.bg).toMatch(VALID_HEX)
  expect(d.palette.text).toMatch(VALID_HEX)
  expect(d.palette.accent).toMatch(VALID_HEX)

  // every slot cell in bounds
  for (const slot of d.slots) {
    expect(cellInBounds(slot.cell)).toBe(true)
  }

  // at least one slot
  expect(d.slots.length).toBeGreaterThan(0)
}

describe('mutate', () => {
  test('produces a valid design at strength 0.5 (50 runs)', () => {
    const base = generate('4:5')
    for (let i = 0; i < 50; i++) {
      const variant = mutate(base, 0.5)
      checkDesignValid(variant)
      // format preserved
      expect(variant.format).toBe(base.format)
      // grid preserved
      expect(variant.grid).toEqual(base.grid)
    }
  })

  test('preserves slot content for matching slot ids', () => {
    const base = generate('4:5')
    // Give a few slots distinct content
    const withContent: Design = {
      ...base,
      slots: base.slots.map((s, i) => ({
        ...s,
        content: s.role !== 'image' ? `CONTENT_${i}` : s.content,
      })),
    }
    const contentMap = new Map(withContent.slots.map(s => [s.id, s.content]))

    // Use low strength to maximize id-matching variants
    const variant = mutate(withContent, 0.3)
    for (const slot of variant.slots) {
      if (contentMap.has(slot.id)) {
        expect(slot.content).toBe(contentMap.get(slot.id))
      }
    }
  })

  test('outputs vary across 50 runs at strength 0.5', () => {
    const base = generate('4:5')
    const seeds = new Set<number>()
    for (let i = 0; i < 50; i++) {
      seeds.add(mutate(base, 0.5).seed)
    }
    // At least a few unique seeds — practically all 50 will be unique
    expect(seeds.size).toBeGreaterThan(10)
  })

  test('produces valid designs at strength 0 (subtle)', () => {
    const base = generate('4:5')
    for (let i = 0; i < 10; i++) {
      const variant = mutate(base, 0)
      checkDesignValid(variant)
      expect(variant.format).toBe(base.format)
    }
  })

  test('produces valid designs at strength 1 (wild)', () => {
    const base = generate('4:5')
    for (let i = 0; i < 20; i++) {
      const variant = mutate(base, 1)
      checkDesignValid(variant)
      expect(variant.format).toBe(base.format)
    }
  })

  test('typography stays within sane ranges after mutation', () => {
    const base = generate('4:5')
    for (let i = 0; i < 30; i++) {
      const v = mutate(base, 0.8)
      expect(v.typography.title).toBeGreaterThanOrEqual(60)
      expect(v.typography.title).toBeLessThanOrEqual(300)
      expect(v.typography.headline).toBeGreaterThanOrEqual(80)
      expect(v.typography.headline).toBeLessThanOrEqual(400)
      expect(v.typography.body).toBeGreaterThanOrEqual(12)
      expect(v.typography.body).toBeLessThanOrEqual(30)
      expect(v.typography.tracking).toBeGreaterThanOrEqual(-0.08)
      expect(v.typography.tracking).toBeLessThanOrEqual(0.1)
    }
  })
})

import { expect, test } from 'vitest'
import { LAYOUTS, buildFromLayout } from './layouts'
import { getArchetype } from '../archetypes'
import '../archetypes/index'

test('LAYOUTS has exactly 19 entries', () => {
  expect(LAYOUTS.length).toBe(19)
})

test('LAYOUTS n values are 1..19 in order', () => {
  expect(LAYOUTS.map(l => l.n)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19])
})

test('all archetype ids in LAYOUTS resolve in the registry', () => {
  for (const def of LAYOUTS) {
    expect(() => getArchetype(def.archetype), `archetype "${def.archetype}" not found`).not.toThrow()
  }
})

test('all 12 archetypes appear at least once in LAYOUTS', () => {
  const archetypes = new Set(LAYOUTS.map(l => l.archetype))
  expect(archetypes.size).toBe(12)
})

test('every variant index is within the archetype variants array', () => {
  for (const def of LAYOUTS) {
    const arch = getArchetype(def.archetype)
    expect(def.variant, `layout ${def.n} variant ${def.variant} out of range for ${def.archetype}`).toBeLessThan(arch.variants.length)
  }
})

test('all 19 layouts build without throwing for format 3:4', () => {
  for (const def of LAYOUTS) {
    const design = buildFromLayout(def.n, '3:4')
    expect(design.layout).toBe(def.n)
    for (const slot of design.slots) {
      expect(slot.cell, `layout ${def.n} slot ${slot.id} cell undefined`).toBeDefined()
      expect(slot.cell.c).toBeTypeOf('number')
      expect(slot.cell.cs).toBeTypeOf('number')
      expect(slot.cell.r).toBeTypeOf('number')
      expect(slot.cell.rs).toBeTypeOf('number')
    }
  }
})

test('buildFromLayout throws on out-of-range n', () => {
  expect(() => buildFromLayout(0, '4:5')).toThrow()
  expect(() => buildFromLayout(20, '4:5')).toThrow()
})

test('buildFromLayout design.layout matches n', () => {
  const d = buildFromLayout(5, '3:4')
  expect(d.layout).toBe(5)
})

test('each layout entry has a non-empty name', () => {
  for (const def of LAYOUTS) {
    expect(def.name.trim().length).toBeGreaterThan(0)
  }
})

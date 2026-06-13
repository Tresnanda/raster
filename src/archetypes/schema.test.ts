import { expect, test } from 'vitest'
import { getArchetype, listArchetypes } from './index'

test('registry exposes archetypes by id', () => {
  const a = getArchetype('mega-word')
  expect(a.id).toBe('mega-word')
  expect(a.variants.length).toBeGreaterThanOrEqual(1)
})

test('every variant covers exactly the declared slot ids', () => {
  for (const a of listArchetypes()) {
    const ids = a.slots.map(s => s.id).sort()
    for (const v of a.variants) {
      expect(Object.keys(v).sort()).toEqual(ids)
    }
  }
})

test('unknown id throws', () => {
  expect(() => getArchetype('nope')).toThrow()
})

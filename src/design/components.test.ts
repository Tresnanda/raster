import { beforeEach, expect, test } from 'vitest'
import { buildDesign } from './build'
import {
  createSavedComponent,
  insertSavedComponent,
  readSavedComponents,
  writeSavedComponents,
} from './components'
import '../archetypes/index'

beforeEach(() => {
  localStorage.clear()
})

test('createSavedComponent stores slots relative to the selected group origin', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const component = createSavedComponent(design, ['word', 'subhead'], {
    id: 'component-1',
    name: 'Title Pair',
    now: '2026-06-14T08:00:00.000Z',
  })

  expect(component.slots.map(slot => slot.id)).toEqual(['word', 'subhead'])
  expect(component.slots[0].cell.c).toBe(0)
  expect(component.slots[0].cell.r).toBe(0)
})

test('insertSavedComponent clones slots with new ids and preserves relative geometry', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const component = createSavedComponent(design, ['word', 'subhead'], {
    id: 'component-1',
    name: 'Title Pair',
    now: '2026-06-14T08:00:00.000Z',
  })
  const next = insertSavedComponent(design, component, { c: 0, r: 3 })
  const inserted = next.slots.slice(-2)

  expect(new Set(inserted.map(slot => slot.id)).size).toBe(2)
  expect(design.slots.some(slot => slot.id === inserted[0].id)).toBe(false)
  expect(inserted[0].content).toBe('ATL3')
  expect(inserted[0].cell).toEqual({ ...component.slots[0].cell, c: 0, r: 3 })
  expect(inserted[1].cell.r - inserted[0].cell.r).toBe(component.slots[1].cell.r - component.slots[0].cell.r)
})

test('readSavedComponents and writeSavedComponents round-trip local components', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const component = createSavedComponent(design, ['word'], {
    id: 'component-1',
    name: 'Title',
    now: '2026-06-14T08:00:00.000Z',
  })

  expect(writeSavedComponents([component])).toBe(true)
  expect(readSavedComponents()[0].name).toBe('Title')
})

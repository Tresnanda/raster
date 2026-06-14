import { expect, test, beforeEach } from 'vitest'
import { useDesign } from './useDesign'
import '../archetypes/index'

beforeEach(() => useDesign.getState().reset('mega-word', '4:5'))

test('toggleSelection adds/removes ids; selectedId mirrors the last', () => {
  const [a, b] = useDesign.getState().design.slots.map(s => s.id)
  useDesign.getState().selectElement(a)
  useDesign.getState().toggleSelection(b)
  expect(useDesign.getState().selectedIds).toEqual([a, b])
  expect(useDesign.getState().selectedId).toBe(b)
  useDesign.getState().toggleSelection(b)
  expect(useDesign.getState().selectedIds).toEqual([a])
  expect(useDesign.getState().selectedId).toBe(a)
})

test('setSelection / clearSelection', () => {
  const ids = useDesign.getState().design.slots.slice(0, 2).map(s => s.id)
  useDesign.getState().setSelection(ids)
  expect(useDesign.getState().selectedIds).toEqual(ids)
  useDesign.getState().clearSelection()
  expect(useDesign.getState().selectedIds).toEqual([])
  expect(useDesign.getState().selectedId).toBeNull()
})

test('setBoxes batch-updates boxes in one undo step', () => {
  const [a, b] = useDesign.getState().design.slots.map(s => s.id)
  const past0 = useDesign.getState().past.length
  useDesign.getState().setBoxes([
    { id: a, box: { x: 10, y: 10, w: 100, h: 50 } },
    { id: b, box: { x: 20, y: 20, w: 80, h: 40 } },
  ])
  expect(useDesign.getState().design.slots.find(s => s.id === a)!.box).toEqual({ x: 10, y: 10, w: 100, h: 50 })
  expect(useDesign.getState().past.length).toBe(past0 + 1) // single history entry
})

test('alignSelection left aligns selected boxes to the selection left edge', () => {
  const slots = useDesign.getState().design.slots.slice(0, 2)
  useDesign.getState().setBoxes([
    { id: slots[0].id, box: { x: 100, y: 0, w: 50, h: 50 } },
    { id: slots[1].id, box: { x: 300, y: 0, w: 50, h: 50 } },
  ])
  useDesign.getState().setSelection(slots.map(s => s.id))
  useDesign.getState().alignSelection('left')
  const xs = slots.map(s => useDesign.getState().design.slots.find(x => x.id === s.id)!.box!.x)
  expect(xs[0]).toBe(xs[1]) // both share the same left edge (the min, 100)
  expect(xs[0]).toBe(100)
})

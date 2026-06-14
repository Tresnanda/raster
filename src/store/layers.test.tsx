import { expect, test, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useDesign } from './useDesign'
import { Renderer } from '../render/Renderer'
import '../archetypes/index'

const measure = (t: string, s: number) => t.length * s * 0.5

beforeEach(() => useDesign.getState().reset('mega-word', '4:5'))

test('toggleHidden hides + shows a slot and is undoable', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().toggleHidden(id)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.hidden).toBe(true)
  useDesign.getState().undo()
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.hidden).toBeFalsy()
})

test('toggleLocked locks/unlocks a slot', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().toggleLocked(id)
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.locked).toBe(true)
})

test('renameSlot sets a custom name', () => {
  const id = useDesign.getState().design.slots[0].id
  useDesign.getState().renameSlot(id, 'My Headline')
  expect(useDesign.getState().design.slots.find(s => s.id === id)!.name).toBe('My Headline')
})

test('renderer skips hidden slots', () => {
  const id = useDesign.getState().design.slots.find(s => s.text)!.id
  const before = render(<Renderer design={useDesign.getState().design} measure={measure} />)
  const groupsBefore = before.container.querySelectorAll(`[data-slot="${id}"]`).length
  expect(groupsBefore).toBe(1)
  useDesign.getState().toggleHidden(id)
  const after = render(<Renderer design={useDesign.getState().design} measure={measure} />)
  expect(after.container.querySelectorAll(`[data-slot="${id}"]`).length).toBe(0)
})

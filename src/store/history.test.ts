// src/store/history.test.ts
// Tests for undo/redo history, coalescing, clipboard (copy/cut/paste).

import { beforeEach, describe, expect, test } from 'vitest'
import { useDesign } from './useDesign'
import '../archetypes/index'

// Reset store before each test for isolation.
beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().selectElement(null)
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function getState() {
  return useDesign.getState()
}

// ── Basic undo / redo ─────────────────────────────────────────────────────────

describe('undo/redo basics', () => {
  test('canUndo is false immediately after reset', () => {
    expect(getState().past.length).toBe(0)
  })

  test('canRedo is false immediately after reset', () => {
    expect(getState().future.length).toBe(0)
  })

  test('addElement then undo removes it', () => {
    const before = getState().design.slots.length
    getState().addElement('text')
    expect(getState().design.slots.length).toBe(before + 1)

    getState().undo()
    expect(getState().design.slots.length).toBe(before)
  })

  test('undo restores prior design state', () => {
    const originalContent = getState().design.slots[0]?.content ?? ''
    const slotId = getState().design.slots[0]?.id ?? ''
    expect(slotId).toBeTruthy()

    getState().setContent(slotId, 'CHANGED')
    expect(getState().design.slots.find(s => s.id === slotId)?.content).toBe('CHANGED')

    getState().undo()
    expect(getState().design.slots.find(s => s.id === slotId)?.content).toBe(originalContent)
  })

  test('redo after undo re-applies the change', () => {
    const slotId = getState().design.slots[0]?.id ?? ''
    getState().setContent(slotId, 'CHANGED')
    getState().undo()
    getState().redo()
    expect(getState().design.slots.find(s => s.id === slotId)?.content).toBe('CHANGED')
  })

  test('addElement then undo then redo restores the element', () => {
    const before = getState().design.slots.length
    getState().addElement('image')
    getState().undo()
    expect(getState().design.slots.length).toBe(before)
    getState().redo()
    expect(getState().design.slots.length).toBe(before + 1)
  })

  test('undo clears future if a new action occurs after undo', () => {
    const slotId = getState().design.slots[0]?.id ?? ''
    getState().setContent(slotId, 'A')
    getState().setContent(slotId, 'B')
    getState().undo()  // back to A
    // Now make a new edit — future should clear
    getState().setContent(slotId, 'C')
    expect(getState().future.length).toBe(0)
  })

  test('undo with nothing in past is a no-op', () => {
    expect(getState().past.length).toBe(0)
    const design = getState().design
    getState().undo()
    expect(getState().design).toBe(design)  // same reference — nothing changed
  })

  test('redo with nothing in future is a no-op', () => {
    expect(getState().future.length).toBe(0)
    const design = getState().design
    getState().redo()
    expect(getState().design).toBe(design)
  })

  test('undo clears selectedId when the selected slot no longer exists in restored design', () => {
    const before = getState().design.slots.length
    getState().addElement('block')
    const newId = getState().selectedId!
    expect(newId).toBeTruthy()

    // Still selected
    expect(getState().selectedId).toBe(newId)

    getState().undo()
    // The design now has one fewer slot; the selected slot is gone
    expect(getState().design.slots.length).toBe(before)
    expect(getState().selectedId).toBeNull()
  })
})

// ── Coalescing ────────────────────────────────────────────────────────────────

describe('coalescing', () => {
  test('5x setContent on the same slot = 1 undo step (restores pre-edit content)', () => {
    const slotId = getState().design.slots[0]?.id ?? ''
    const original = getState().design.slots[0]?.content ?? ''

    // First call creates one past entry; subsequent calls with the same coalesceKey don't
    getState().setContent(slotId, 'A')
    getState().setContent(slotId, 'AB')
    getState().setContent(slotId, 'ABC')
    getState().setContent(slotId, 'ABCD')
    getState().setContent(slotId, 'ABCDE')

    expect(getState().design.slots.find(s => s.id === slotId)?.content).toBe('ABCDE')

    // One undo should bring us all the way back to the original
    getState().undo()
    expect(getState().design.slots.find(s => s.id === slotId)?.content).toBe(original)

    // past should now be empty (the single coalesced step was the only one)
    expect(getState().past.length).toBe(0)
  })

  test('setContent on different slots are separate undo steps', () => {
    const slots = getState().design.slots.filter(s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line')
    if (slots.length < 2) return  // skip if archetype has <2 text slots

    const [s1, s2] = slots
    getState().setContent(s1.id, 'FIRST')
    getState().setContent(s2.id, 'SECOND')

    // Two separate steps
    expect(getState().past.length).toBe(2)

    getState().undo()  // removes SECOND
    expect(getState().design.slots.find(s => s.id === s2.id)?.content).not.toBe('SECOND')

    getState().undo()  // removes FIRST
    expect(getState().design.slots.find(s => s.id === s1.id)?.content).not.toBe('FIRST')
  })

  test('setBox on same slot coalesces', () => {
    const slotId = getState().design.slots[0]?.id ?? ''
    const originalBox = getState().design.slots[0]?.box ?? { x: 0, y: 0, w: 100, h: 100 }

    getState().setBox(slotId, { ...originalBox, x: 10 })
    getState().setBox(slotId, { ...originalBox, x: 20 })
    getState().setBox(slotId, { ...originalBox, x: 30 })

    expect(getState().design.slots.find(s => s.id === slotId)?.box?.x).toBe(30)

    getState().undo()
    // After one undo the box should be restored to whatever was before the first setBox
    const restoredBox = getState().design.slots.find(s => s.id === slotId)?.box
    // The restored x should not be 30 (the final edit value)
    expect(restoredBox?.x).not.toBe(30)
    expect(getState().past.length).toBe(0)
  })

  test('typography changes coalesce to one undo step', () => {
    getState().setTypography({ tracking: 2 })
    getState().setTypography({ tracking: 4 })
    getState().setTypography({ tracking: 6 })

    expect(getState().design.typography.tracking).toBe(6)
    getState().undo()
    // Should be back to the original (DEFAULT_TYPOGRAPHY.tracking = -0.02)
    expect(getState().design.typography.tracking).toBe(-0.02)
    expect(getState().past.length).toBe(0)
  })

  test('non-coalesced actions each add a past entry', () => {
    const before = getState().past.length  // 0 after reset
    getState().addElement('text')
    getState().addElement('image')
    getState().addElement('block')
    expect(getState().past.length).toBe(before + 3)
  })
})

// ── Clipboard: copy / cut / paste ─────────────────────────────────────────────

describe('clipboard', () => {
  test('copySelected puts the slot in clipboard (no design mutation)', () => {
    const slot = getState().design.slots[0]
    getState().selectElement(slot.id)
    const slotCount = getState().design.slots.length

    getState().copySelected()

    expect(getState().clipboard).toBeTruthy()
    expect(getState().clipboard?.id).toBe(slot.id)
    expect(getState().design.slots.length).toBe(slotCount)  // no mutation
  })

  test('copySelected is a no-op when nothing selected', () => {
    getState().selectElement(null)
    getState().copySelected()
    expect(getState().clipboard).toBeNull()
  })

  test('paste creates a new element with a different id', () => {
    const slot = getState().design.slots[0]
    getState().selectElement(slot.id)
    getState().copySelected()

    const before = getState().design.slots.length
    getState().paste()

    expect(getState().design.slots.length).toBe(before + 1)
    const pasted = getState().design.slots.find(s => s.id === getState().selectedId)
    expect(pasted).toBeTruthy()
    expect(pasted?.id).not.toBe(slot.id)
  })

  test('paste offsets the box by +24,+24 from clipboard position', () => {
    const slot = getState().design.slots[0]
    getState().selectElement(slot.id)
    getState().copySelected()

    const clipBox = getState().clipboard?.box
    getState().paste()

    const pasted = getState().design.slots.find(s => s.id === getState().selectedId)
    expect(pasted?.box).toBeTruthy()
    if (clipBox && pasted?.box) {
      expect(pasted.box.x).toBe(clipBox.x + 24)
      expect(pasted.box.y).toBe(clipBox.y + 24)
    }
  })

  test('paste is one history step (undo removes pasted element)', () => {
    const slot = getState().design.slots[0]
    getState().selectElement(slot.id)
    getState().copySelected()
    const before = getState().design.slots.length
    getState().paste()
    expect(getState().design.slots.length).toBe(before + 1)

    getState().undo()
    expect(getState().design.slots.length).toBe(before)
  })

  test('cut removes the element from design (one history step)', () => {
    const slot = getState().design.slots[0]
    const slotId = slot.id
    getState().selectElement(slotId)
    const before = getState().design.slots.length

    getState().cutSelected()

    expect(getState().clipboard?.id).toBe(slotId)
    expect(getState().design.slots.find(s => s.id === slotId)).toBeUndefined()
    expect(getState().design.slots.length).toBe(before - 1)
  })

  test('cut then paste restores a copy of the element', () => {
    const slot = getState().design.slots[0]
    const slotId = slot.id
    getState().selectElement(slotId)
    const before = getState().design.slots.length

    getState().cutSelected()
    expect(getState().design.slots.length).toBe(before - 1)

    getState().paste()
    expect(getState().design.slots.length).toBe(before)

    // The pasted element has a new id
    const pasted = getState().design.slots.find(s => s.id === getState().selectedId)
    expect(pasted?.id).not.toBe(slotId)
  })

  test('paste without clipboard is a no-op', () => {
    expect(getState().clipboard).toBeNull()
    const before = getState().design.slots.length
    getState().paste()
    expect(getState().design.slots.length).toBe(before)
  })
})

// ── History is in-memory only (no past/future on fresh state) ─────────────────

describe('history isolation', () => {
  test('reset clears history', () => {
    const slotId = getState().design.slots[0]?.id ?? ''
    getState().setContent(slotId, 'A')
    expect(getState().past.length).toBeGreaterThan(0)

    getState().reset('mega-word', '4:5')
    expect(getState().past.length).toBe(0)
    expect(getState().future.length).toBe(0)
  })
})

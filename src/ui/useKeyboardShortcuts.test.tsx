// src/ui/useKeyboardShortcuts.test.tsx
// Tests: verify the hook wires global keydown events to store actions,
// and that events are ignored while focus is in a textarea.

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

// Minimal component that mounts the hook
function Harness() {
  useKeyboardShortcuts()
  return null
}

afterEach(() => {
  // Unmount all rendered components so hook event listeners are removed between tests.
  cleanup()
})

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().selectElement(null)
})

/** Fire a keyboard event at the window (normal case) or a specific DOM element (guard case). */
async function fireKey(init: KeyboardEventInit, element?: HTMLElement) {
  await act(async () => {
    const target = element ?? window
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
  })
}

// ── Undo / Redo ───────────────────────────────────────────────────────────────

describe('undo/redo shortcuts', () => {
  test('Cmd+Z calls undo()', async () => {
    // Set up a past entry
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().setContent(slotId, 'X')

    const { unmount } = render(<Harness />)
    const before = useDesign.getState().design.slots.find(s => s.id === slotId)?.content
    expect(before).toBe('X')

    await fireKey({ key: 'z', metaKey: true, shiftKey: false })
    unmount()

    // Content should be restored to original (undo was called)
    const after = useDesign.getState().design.slots.find(s => s.id === slotId)?.content
    expect(after).not.toBe('X')
  })

  test('Ctrl+Z calls undo()', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().setContent(slotId, 'Y')

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'z', ctrlKey: true, shiftKey: false })
    unmount()

    const after = useDesign.getState().design.slots.find(s => s.id === slotId)?.content
    expect(after).not.toBe('Y')
  })

  test('Cmd+Shift+Z calls redo()', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().setContent(slotId, 'X')
    useDesign.getState().undo()  // now can redo
    expect(useDesign.getState().future.length).toBeGreaterThan(0)

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'z', metaKey: true, shiftKey: true })
    unmount()

    // After redo, the content should be 'X' again
    const after = useDesign.getState().design.slots.find(s => s.id === slotId)?.content
    expect(after).toBe('X')
  })

  test('Cmd+Y calls redo()', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().setContent(slotId, 'Z')
    useDesign.getState().undo()
    expect(useDesign.getState().future.length).toBeGreaterThan(0)

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'y', metaKey: true })
    unmount()

    const after = useDesign.getState().design.slots.find(s => s.id === slotId)?.content
    expect(after).toBe('Z')
  })
})

// ── Clipboard shortcuts ───────────────────────────────────────────────────────

describe('clipboard shortcuts', () => {
  test('Cmd+C populates clipboard when something is selected', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)

    const { unmount } = render(<Harness />)
    expect(useDesign.getState().clipboard).toBeNull()

    await fireKey({ key: 'c', metaKey: true })
    unmount()

    expect(useDesign.getState().clipboard).not.toBeNull()
    expect(useDesign.getState().clipboard?.id).toBe(slotId)
  })

  test('Cmd+X removes element from design and populates clipboard', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'x', metaKey: true })
    unmount()

    expect(useDesign.getState().clipboard).not.toBeNull()
    expect(useDesign.getState().design.slots.length).toBe(before - 1)
  })

  test('Cmd+V pastes the clipboard as a new element', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    useDesign.getState().copySelected()
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'v', metaKey: true })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
  })
})

// ── Other shortcuts ───────────────────────────────────────────────────────────

describe('other shortcuts', () => {
  test('Delete key deletes selected element', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'Delete' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before - 1)
    expect(useDesign.getState().design.slots.find(s => s.id === slotId)).toBeUndefined()
  })

  test('Backspace key deletes selected element', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'Backspace' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before - 1)
  })

  test('Escape deselects the selected element', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'Escape' })
    unmount()

    expect(useDesign.getState().selectedId).toBeNull()
  })

  test('Cmd+D duplicates selected element', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)
    await fireKey({ key: 'd', metaKey: true })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
  })

  test('"t" key adds a text element when not typing', async () => {
    const before = useDesign.getState().design.slots.length
    const { unmount } = render(<Harness />)

    await fireKey({ key: 't' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
    const added = useDesign.getState().design.slots[useDesign.getState().design.slots.length - 1]
    expect(added.role).toBe('caption')
  })

  test('"i" key adds an image element when not typing', async () => {
    const before = useDesign.getState().design.slots.length
    const { unmount } = render(<Harness />)

    await fireKey({ key: 'i' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
    const added = useDesign.getState().design.slots[useDesign.getState().design.slots.length - 1]
    expect(added.role).toBe('image')
  })

  test('"r" key adds a block element when not typing', async () => {
    const before = useDesign.getState().design.slots.length
    const { unmount } = render(<Harness />)

    await fireKey({ key: 'r' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
    const added = useDesign.getState().design.slots[useDesign.getState().design.slots.length - 1]
    expect(added.role).toBe('block')
  })

  test('"l" key adds a line element when not typing', async () => {
    const before = useDesign.getState().design.slots.length
    const { unmount } = render(<Harness />)

    await fireKey({ key: 'l' })
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before + 1)
    const added = useDesign.getState().design.slots[useDesign.getState().design.slots.length - 1]
    expect(added.role).toBe('line')
  })
})

// ── Guard: ignore shortcuts while typing in a textarea ────────────────────────

describe('editable target guard', () => {
  test('Cmd+Z does NOT undo when target is a textarea', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().setContent(slotId, 'X')

    const { unmount } = render(<Harness />)

    // Attach a textarea to the document so keydown bubbles with correct target
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    await fireKey({ key: 'z', metaKey: true, shiftKey: false }, textarea)
    document.body.removeChild(textarea)
    unmount()

    // Content should still be 'X' because the guard suppressed the undo
    expect(useDesign.getState().design.slots.find(s => s.id === slotId)?.content).toBe('X')
  })

  test('Delete does NOT delete element when target is an input', async () => {
    const slotId = useDesign.getState().design.slots[0]?.id ?? ''
    useDesign.getState().selectElement(slotId)
    const before = useDesign.getState().design.slots.length

    const { unmount } = render(<Harness />)

    const input = document.createElement('input')
    document.body.appendChild(input)
    await fireKey({ key: 'Delete' }, input)
    document.body.removeChild(input)
    unmount()

    // Element should still be there
    expect(useDesign.getState().design.slots.length).toBe(before)
  })

  test('"t" tool key does NOT add element when target is a textarea', async () => {
    const before = useDesign.getState().design.slots.length
    const { unmount } = render(<Harness />)

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    await fireKey({ key: 't' }, textarea)
    document.body.removeChild(textarea)
    unmount()

    expect(useDesign.getState().design.slots.length).toBe(before)
  })
})

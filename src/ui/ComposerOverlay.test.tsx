import { expect, test, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { ComposerOverlay } from './ComposerOverlay'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

// Reset store before each test so tests are isolated
beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  // Deselect any selection
  useDesign.getState().selectElement(null)
})

// ─── Helper: find slot elements ───────────────────────────────────────────────

function getSlots(container: HTMLElement) {
  return container.querySelectorAll('[data-composer-slot]')
}

function getFirstTextSlot(container: HTMLElement): Element | null {
  const slots = container.querySelectorAll('[data-composer-slot]')
  for (const el of Array.from(slots)) {
    const role = el.getAttribute('data-slot-role')
    // Text roles: headline, subhead, caption, date, index, glyph, mark
    if (role && role !== 'image' && role !== 'block' && role !== 'line') {
      // Also verify this slot has text (role that renders text)
      return el
    }
  }
  return null
}

function getFirstImageSlot(container: HTMLElement): Element | null {
  return container.querySelector('[data-slot-role="image"]')
}

async function openContextMenu(container: HTMLElement) {
  const firstSlot = getSlots(container)[0] as HTMLElement
  expect(firstSlot).toBeTruthy()
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.contextMenu(firstSlot, { clientX: 48, clientY: 64 })
  })

  expect(container.querySelector('[data-composer-context-menu]')).toBeTruthy()
  return slotId
}

async function clickContextMenuAction(container: HTMLElement, label: string) {
  const btn = container.querySelector(`[aria-label="${label}"]`) as HTMLElement
  expect(btn).toBeTruthy()

  await act(async () => {
    fireEvent.click(btn)
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('renders slot hit areas for all design slots', () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const slots = getSlots(container)
  expect(slots.length).toBeGreaterThan(0)
})

test('clicking a slot selects it (store.selectedId is set)', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement
  expect(firstSlot).toBeTruthy()
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  expect(useDesign.getState().selectedId).toBe(slotId)
})

test('clicking the overlay background deselects (selectedId becomes null)', async () => {
  // First select something
  const firstSlot = useDesign.getState().design.slots[0]
  useDesign.getState().selectElement(firstSlot.id)

  const { container } = render(<ComposerOverlay scale={1} />)
  const overlay = container.querySelector('[data-overlay-bg]')!

  await act(async () => {
    fireEvent.click(overlay)
  })

  expect(useDesign.getState().selectedId).toBeNull()
})

test('selected element renders 8 resize handles', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const handles = container.querySelectorAll('[data-handle]')
  expect(handles.length).toBe(8)
})

test('selected element renders the floating toolbar', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const toolbar = container.querySelector('[data-composer-toolbar]')
  expect(toolbar).toBeTruthy()
})

test('toolbar has Duplicate, Delete, Bring forward, Send backward buttons', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  expect(container.querySelector('[aria-label="Duplicate"]')).toBeTruthy()
  expect(container.querySelector('[aria-label="Delete"]')).toBeTruthy()
  expect(container.querySelector('[aria-label="Bring forward"]')).toBeTruthy()
  expect(container.querySelector('[aria-label="Send backward"]')).toBeTruthy()
})

test('right-clicking a slot opens the context menu with component and tidy actions', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  await openContextMenu(container)

  expect(container.querySelector('[data-composer-context-menu]')).toBeTruthy()
  expect(container.querySelector('[aria-label="Save as component"]')).toBeTruthy()
  expect(container.querySelector('[aria-label="Auto-tidy from context"]')).toBeTruthy()
})

test.each([
  ['Cut', 'cutSelected', []],
  ['Copy', 'copySelected', []],
  ['Paste', 'paste', []],
  ['Duplicate', 'duplicateElement', ['slot']],
  ['Bring forward', 'bringForward', ['slot']],
  ['Send backward', 'sendBackward', ['slot']],
  ['Lock', 'toggleLocked', ['slot']],
  ['Hide', 'toggleHidden', ['slot']],
  ['Align left', 'alignSelection', ['left']],
  ['Align top', 'alignSelection', ['top']],
  ['Save as component', 'saveSelectedComponent', ['Component']],
  ['Auto-tidy from context', 'autoTidy', []],
  ['Delete', 'deleteElement', ['slot']],
] as const)('context menu dispatches %s', async (label, actionName, expectedArgs) => {
  const store = useDesign.getState() as unknown as Record<string, (...args: unknown[]) => unknown>
  const action = vi.spyOn(store, actionName)
  const { container } = render(<ComposerOverlay scale={1} />)
  const slotId = await openContextMenu(container)
  const args = expectedArgs.map(arg => arg === 'slot' ? slotId : arg)

  await clickContextMenuAction(container, label)

  expect(action).toHaveBeenCalledWith(...args)
  expect(container.querySelector('[data-composer-context-menu]')).toBeNull()
})

test('clicking Delete in toolbar calls deleteElement with correct id', async () => {
  const deleteElement = vi.spyOn(useDesign.getState(), 'deleteElement')

  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const deleteBtn = container.querySelector('[aria-label="Delete"]') as HTMLElement
  expect(deleteBtn).toBeTruthy()

  await act(async () => {
    fireEvent.click(deleteBtn)
  })

  expect(deleteElement).toHaveBeenCalledWith(slotId)
})

test('clicking Duplicate in toolbar calls duplicateElement with correct id', async () => {
  const duplicateElement = vi.spyOn(useDesign.getState(), 'duplicateElement')

  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const dupeBtn = container.querySelector('[aria-label="Duplicate"]') as HTMLElement
  await act(async () => {
    fireEvent.click(dupeBtn)
  })

  expect(duplicateElement).toHaveBeenCalledWith(slotId)
})

test('clicking Bring forward calls bringForward', async () => {
  const bringForward = vi.spyOn(useDesign.getState(), 'bringForward')

  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const btn = container.querySelector('[aria-label="Bring forward"]') as HTMLElement
  await act(async () => {
    fireEvent.click(btn)
  })

  expect(bringForward).toHaveBeenCalledWith(slotId)
})

test('clicking Send backward calls sendBackward', async () => {
  const sendBackward = vi.spyOn(useDesign.getState(), 'sendBackward')

  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement
  const slotId = firstSlot.getAttribute('data-composer-slot')!

  await act(async () => {
    fireEvent.click(firstSlot)
  })

  const btn = container.querySelector('[aria-label="Send backward"]') as HTMLElement
  await act(async () => {
    fireEvent.click(btn)
  })

  expect(sendBackward).toHaveBeenCalledWith(slotId)
})

test('double-clicking a text element reveals a textarea', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement
  expect(textSlot).toBeTruthy()

  // No textarea initially
  expect(container.querySelector('textarea')).toBeNull()

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  expect(container.querySelector('textarea')).toBeTruthy()
})

test('textarea is bound to the slot content via setContent', async () => {
  const setContent = vi.spyOn(useDesign.getState(), 'setContent')

  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.change(textarea, { target: { value: 'HELLO WORLD' } })
  })

  expect(setContent).toHaveBeenCalledWith(expect.any(String), 'HELLO WORLD')
})

test('pressing Escape in textarea exits edit mode (textarea disappears)', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  expect(container.querySelector('textarea')).toBeTruthy()

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Escape' })
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('pressing Enter (no Shift) in textarea commits and exits edit mode', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('pressing Shift+Enter does not exit edit mode', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
  })

  expect(container.querySelector('textarea')).toBeTruthy()
})

test('blurring the textarea exits edit mode', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const textSlot = getFirstTextSlot(container) as HTMLElement

  await act(async () => {
    fireEvent.dblClick(textSlot)
  })

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.blur(textarea)
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('double-clicking an image slot does NOT open a textarea', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const imageSlot = getFirstImageSlot(container) as HTMLElement
  expect(imageSlot).toBeTruthy()

  await act(async () => {
    fireEvent.dblClick(imageSlot)
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('scale=0 guard: overlay renders without errors and uses scale(1)', () => {
  const { container } = render(<ComposerOverlay scale={0} />)
  const overlay = container.querySelector('[data-composer-overlay]') as HTMLElement
  expect(overlay).toBeTruthy()
  expect(overlay.style.transform).toBe('scale(1)')
})

test('deselecting clears handles and toolbar', async () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement

  // Select
  await act(async () => {
    fireEvent.click(firstSlot)
  })
  expect(container.querySelector('[data-composer-toolbar]')).toBeTruthy()

  // Deselect via background click
  const overlay = container.querySelector('[data-overlay-bg]')!
  await act(async () => {
    fireEvent.click(overlay)
  })

  expect(container.querySelector('[data-composer-toolbar]')).toBeNull()
  expect(container.querySelectorAll('[data-handle]').length).toBe(0)
})

// ── Phase E motion smoke test ─────────────────────────────────────────────────

test('selection outline motion: selecting an element does not throw (GSAP useGSAP hook fires)', async () => {
  const { container, unmount } = render(<ComposerOverlay scale={1} />)
  const firstSlot = getSlots(container)[0] as HTMLElement

  // Select — triggers the selection animation useGSAP hook
  await act(async () => {
    fireEvent.click(firstSlot)
  })

  expect(useDesign.getState().selectedId).not.toBeNull()

  // Select a second slot — exercises selectedId change path
  const slots = getSlots(container)
  if (slots.length > 1) {
    await act(async () => {
      fireEvent.click(slots[1] as HTMLElement)
    })
  }

  unmount()
})

// ── Center-snap guides ─────────────────────────────────────────────────────────

test('center-snap guide elements are not visible before any drag', () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  expect(container.querySelector('[data-center-guide-x]')).toBeNull()
  expect(container.querySelector('[data-center-guide-y]')).toBeNull()
})

test('ComposerOverlay renders without crash when center-snap code is present', () => {
  const { container } = render(<ComposerOverlay scale={1} />)
  const overlay = container.querySelector('[data-composer-overlay]')
  expect(overlay).toBeTruthy()
})

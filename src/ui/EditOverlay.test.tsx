import { expect, test, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { EditOverlay } from './EditOverlay'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

// Reset store before each test so tests are isolated
beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
})

test('renders hit areas for text slots', () => {
  const { container } = render(<EditOverlay scale={1} />)
  const textSlots = container.querySelectorAll('[data-slot-type="text"]')
  expect(textSlots.length).toBeGreaterThan(0)
})

test('renders a hit area for the image slot', () => {
  const { container } = render(<EditOverlay scale={1} />)
  const imageSlots = container.querySelectorAll('[data-slot-type="image"]')
  expect(imageSlots.length).toBeGreaterThanOrEqual(1)
})

test('clicking a text slot reveals a textarea', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  // Before clicking, no textarea
  expect(container.querySelector('textarea')).toBeNull()

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  expect(firstTextHitArea).toBeTruthy()

  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  const textarea = container.querySelector('textarea')
  expect(textarea).toBeTruthy()
})

test('typing in the textarea calls setContent / updates the slot content', async () => {
  const setContent = vi.spyOn(useDesign.getState(), 'setContent')

  const { container } = render(<EditOverlay scale={1} />)

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  const textarea = container.querySelector('textarea')!
  expect(textarea).toBeTruthy()

  await act(async () => {
    fireEvent.change(textarea, { target: { value: 'NEW CONTENT' } })
  })

  expect(setContent).toHaveBeenCalledWith(expect.any(String), 'NEW CONTENT')
})

test('pressing Escape exits edit mode (textarea disappears)', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  expect(container.querySelector('textarea')).toBeTruthy()

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Escape' })
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('pressing Enter (without Shift) commits and exits edit mode', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  expect(container.querySelector('textarea')).toBeTruthy()

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('pressing Shift+Enter does not exit edit mode (inserts newline)', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
  })

  // Should still be editing
  expect(container.querySelector('textarea')).toBeTruthy()
})

test('blurring the textarea exits edit mode', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  const firstTextHitArea = container.querySelector('[data-slot-type="text"]')!
  await act(async () => {
    fireEvent.click(firstTextHitArea)
  })

  expect(container.querySelector('textarea')).toBeTruthy()

  const textarea = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.blur(textarea)
  })

  expect(container.querySelector('textarea')).toBeNull()
})

test('scale=0 guard: overlay renders without errors when scale is 0 (jsdom pre-measurement)', () => {
  // No errors thrown, no NaN in style
  const { container } = render(<EditOverlay scale={0} />)
  const overlay = container.firstElementChild as HTMLElement
  expect(overlay).toBeTruthy()
  // transform should use scale(1), not scale(0) or NaN
  expect(overlay.style.transform).toBe('scale(1)')
})

test('only one slot is in edit mode at a time', async () => {
  const { container } = render(<EditOverlay scale={1} />)

  const textSlots = container.querySelectorAll('[data-slot-type="text"]')
  expect(textSlots.length).toBeGreaterThanOrEqual(2)

  // Click first
  await act(async () => {
    fireEvent.click(textSlots[0])
  })
  expect(container.querySelectorAll('textarea').length).toBe(1)

  // Blur and click second
  const ta = container.querySelector('textarea')!
  await act(async () => {
    fireEvent.blur(ta)
  })
  await act(async () => {
    fireEvent.click(textSlots[1])
  })
  expect(container.querySelectorAll('textarea').length).toBe(1)
})

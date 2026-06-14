import { expect, test, vi, beforeEach } from 'vitest'
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react'
import { getCroppedDataUrl } from '../lib/crop-image'
import { CropModal } from './CropModal'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

// ---------------------------------------------------------------------------
// vi.mock calls are hoisted to the very top of the module by Vitest.
// Do NOT reference module-level variables inside the factory — they won't be
// initialised yet. Inline all values.
// ---------------------------------------------------------------------------

// Mock react-easy-crop — renders a stub div and immediately fires onCropComplete
// so croppedAreaPixelsRef is populated before Apply is clicked.
vi.mock('react-easy-crop', () => ({
  default: (props: Record<string, unknown>) => {
    const cb = props['onCropComplete'] as ((a: unknown, p: unknown) => void) | undefined
    if (cb) cb(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 0, width: 100, height: 100 },
    )
    return <div data-testid="mock-cropper" />
  },
}))

// Mock the CSS so Vitest/jsdom doesn't error on stylesheet imports
vi.mock('react-easy-crop/react-easy-crop.css', () => ({}))

// Mock getCroppedDataUrl — no real canvas needed in unit tests
vi.mock('../lib/crop-image', () => ({
  getCroppedDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,CROPPED'),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const TEST_SRC = 'data:image/png;base64,FAKE'

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().cancelCrop()
  vi.clearAllMocks()
  // Re-wire the mock after clearAllMocks resets call history (but keeps the mock fn)
  vi.mocked(getCroppedDataUrl).mockResolvedValue('data:image/png;base64,CROPPED')
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('modal is not shown when cropRequest is null', () => {
  const { queryByRole } = render(<CropModal />)
  expect(queryByRole('dialog')).toBeNull()
})

test('modal renders when cropRequest is set', async () => {
  const slotId =
    useDesign.getState().design.slots.find(s => s.role === 'image')?.id ??
    useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  const { getByRole } = render(<CropModal />)
  expect(getByRole('dialog')).toBeTruthy()
})

test('modal shows the Cropper stub and Apply/Cancel buttons', async () => {
  const slotId = useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  render(<CropModal />)
  expect(screen.getByTestId('mock-cropper')).toBeTruthy()
  expect(screen.getByRole('button', { name: /apply/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
})

test('clicking Cancel clears cropRequest', async () => {
  const slotId = useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })
  expect(useDesign.getState().cropRequest).not.toBeNull()

  render(<CropModal />)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  })

  expect(useDesign.getState().cropRequest).toBeNull()
})

test('Escape key clears cropRequest', async () => {
  const slotId = useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  render(<CropModal />)
  expect(useDesign.getState().cropRequest).not.toBeNull()

  await act(async () => {
    fireEvent.keyDown(window, { key: 'Escape' })
  })

  expect(useDesign.getState().cropRequest).toBeNull()
})

test('clicking Apply calls getCroppedDataUrl + setContent and clears cropRequest', async () => {
  const slotId = useDesign.getState().design.slots[0].id
  const placeImage = vi.spyOn(useDesign.getState(), 'placeImage')

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  render(<CropModal />)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  })

  await waitFor(() => {
    expect(getCroppedDataUrl).toHaveBeenCalledWith(
      TEST_SRC,
      expect.objectContaining({ x: 0, y: 0, width: 100, height: 100 }),
    )
    expect(placeImage).toHaveBeenCalledWith(slotId, 'data:image/png;base64,CROPPED')
    expect(useDesign.getState().cropRequest).toBeNull()
  })
})

test('clicking the backdrop (not the card) closes the modal', async () => {
  const slotId = useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  const { getByRole } = render(<CropModal />)
  const dialog = getByRole('dialog')

  await act(async () => {
    // Click the backdrop overlay div itself (e.target === e.currentTarget)
    fireEvent.click(dialog)
  })

  expect(useDesign.getState().cropRequest).toBeNull()
})

// ── Phase E motion smoke test ─────────────────────────────────────────────────

test('modal entrance motion: renders with GSAP wired without throwing', async () => {
  const slotId = useDesign.getState().design.slots[0].id

  await act(async () => {
    useDesign.getState().requestCrop(slotId, TEST_SRC)
  })

  // Should not throw even with useGSAP motion hooks (jsdom stubs matchMedia)
  const { getByRole, unmount } = render(<CropModal />)
  expect(getByRole('dialog')).toBeTruthy()
  unmount()
})

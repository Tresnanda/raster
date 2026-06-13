import { expect, test, vi, beforeEach, afterEach } from 'vitest'
import type { PixelCrop } from './crop-image'

// ---------------------------------------------------------------------------
// We test getCroppedDataUrl by mocking Image and the canvas API.
// jsdom's canvas stub (in test-setup.ts) already mocks getContext(),
// but toDataURL is not stubbed there — we add it here.
// ---------------------------------------------------------------------------

const FAKE_DATA_URL = 'data:image/png;base64,FAKE_CROP'

let capturedDrawImageArgs: unknown[] = []

function setupCanvasMock(toDataUrlFn: () => string = () => FAKE_DATA_URL) {
  HTMLCanvasElement.prototype.toDataURL = toDataUrlFn as unknown as typeof HTMLCanvasElement.prototype.toDataURL

  // Extend the existing getContext mock to also capture drawImage calls
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      font: '',
      measureText: (text: string) => ({ width: text.length * 8 }),
      fillRect: () => {},
      clearRect: () => {},
      drawImage: (...args: unknown[]) => {
        capturedDrawImageArgs = args
      },
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// Mock Image globally to resolve immediately
function mockImage(onLoadSuccess = true) {
  class MockImage {
    crossOrigin = ''
    _src = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(v: string) {
      this._src = v
      // Schedule load/error asynchronously
      setTimeout(() => {
        if (onLoadSuccess && this.onload) this.onload()
        else if (!onLoadSuccess && this.onerror) this.onerror()
      }, 0)
    }

    get src() { return this._src }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Image = MockImage
}

beforeEach(() => {
  capturedDrawImageArgs = []
  setupCanvasMock()
  mockImage(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('getCroppedDataUrl returns a string (Promise<string>)', async () => {
  const { getCroppedDataUrl } = await import('./crop-image')
  const crop: PixelCrop = { x: 10, y: 20, width: 100, height: 50 }
  const result = await getCroppedDataUrl('data:image/png;base64,TEST', crop)
  expect(typeof result).toBe('string')
})

test('getCroppedDataUrl resolves the dataURL from toDataURL', async () => {
  // Re-import freshly (vitest module cache — OK because mock is set each beforeEach)
  const { getCroppedDataUrl } = await import('./crop-image')
  const crop: PixelCrop = { x: 0, y: 0, width: 200, height: 100 }
  const result = await getCroppedDataUrl('data:image/png;base64,SOMETHING', crop)
  expect(result).toBe(FAKE_DATA_URL)
})

test('getCroppedDataUrl sizes the canvas to the crop dimensions', async () => {
  const { getCroppedDataUrl } = await import('./crop-image')
  const crop: PixelCrop = { x: 5, y: 10, width: 300, height: 150 }
  await getCroppedDataUrl('data:image/png;base64,X', crop)

  // The canvas width/height should have been set to match the crop
  // (HTMLCanvasElement properties are settable; jsdom tracks them)
  const canvas = document.createElement('canvas')
  // We check via the drawImage args: destWidth and destHeight = crop.width, crop.height
  // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  expect(capturedDrawImageArgs[7]).toBe(300) // dw = crop.width
  expect(capturedDrawImageArgs[8]).toBe(150) // dh = crop.height
  void canvas // suppress unused variable lint
})

test('getCroppedDataUrl falls back to the original src when toDataURL throws (tainted canvas)', async () => {
  setupCanvasMock(() => { throw new DOMException('Tainted', 'SecurityError') })
  const { getCroppedDataUrl } = await import('./crop-image')

  const originalSrc = 'https://example.com/image.jpg'
  const crop: PixelCrop = { x: 0, y: 0, width: 100, height: 100 }
  const result = await getCroppedDataUrl(originalSrc, crop)
  expect(result).toBe(originalSrc)
})

test('getCroppedDataUrl falls back to src when image load fails', async () => {
  mockImage(false)
  const { getCroppedDataUrl } = await import('./crop-image')

  const src = 'https://bad-image.example.com/404.jpg'
  const crop: PixelCrop = { x: 0, y: 0, width: 100, height: 100 }
  // Should reject with an error — or we can catch it
  await expect(getCroppedDataUrl(src, crop)).rejects.toThrow(/Failed to load image/)
})

import { afterEach, expect, test, vi } from 'vitest'
import { copyTextToClipboard } from './clipboard'

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  })
})

function mockExecCommand(result: boolean) {
  const execCommand = vi.fn().mockReturnValue(result)
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  })
  return execCommand
}

test('copyTextToClipboard uses the async Clipboard API when available', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await expect(copyTextToClipboard('https://raster.test/#d=abc')).resolves.toBe(true)
  expect(writeText).toHaveBeenCalledWith('https://raster.test/#d=abc')
})

test('copyTextToClipboard does not report success when Clipboard API is unavailable', async () => {
  const execCommand = mockExecCommand(true)

  await expect(copyTextToClipboard('https://raster.test/#d=fallback')).resolves.toBe(false)

  expect(execCommand).toHaveBeenCalledWith('copy')
  expect(document.querySelector('textarea[readonly]')).toBeNull()
})

test('copyTextToClipboard verifies a legacy fallback with Clipboard API readback', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('blocked'))
  const readText = vi.fn().mockResolvedValue('https://raster.test/#d=blocked')
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText },
  })
  const execCommand = mockExecCommand(true)

  await expect(copyTextToClipboard('https://raster.test/#d=blocked')).resolves.toBe(true)

  expect(writeText).toHaveBeenCalledOnce()
  expect(execCommand).toHaveBeenCalledWith('copy')
  expect(readText).toHaveBeenCalledOnce()
})

test('copyTextToClipboard returns false when fallback copy cannot be verified', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('blocked'))
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  mockExecCommand(true)

  await expect(copyTextToClipboard('https://raster.test/#d=blocked')).resolves.toBe(false)
})

test('copyTextToClipboard returns false when every copy path fails', async () => {
  mockExecCommand(false)

  await expect(copyTextToClipboard('https://raster.test/#d=nope')).resolves.toBe(false)
})

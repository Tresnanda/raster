import { expect, test, vi } from 'vitest'
import { makeMeasurer } from './measure'

test('makeMeasurer returns a function that calls canvas measureText', () => {
  const measureText = vi.fn(() => ({ width: 123 }))
  const ctx = { font: '', measureText } as unknown as CanvasRenderingContext2D
  const m = makeMeasurer(() => ctx)
  const w = m('hi', 40, 'display', 800)
  expect(w).toBe(123)
  expect(ctx.font).toContain('40px')
})

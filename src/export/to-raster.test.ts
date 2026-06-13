import { expect, test } from 'vitest'
import { rasterSize } from './to-raster'

test('raster size = canvas * scale', () => {
  expect(rasterSize({ w: 1080, h: 1350 }, 2)).toEqual({ w: 2160, h: 2700 })
  expect(rasterSize({ w: 1920, h: 1080 }, 3)).toEqual({ w: 5760, h: 3240 })
})

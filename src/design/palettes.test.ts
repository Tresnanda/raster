import { expect, test } from 'vitest'
import { PRESET_PALETTES } from './palettes'

test('presets include classic editorial schemes', () => {
  const names = PRESET_PALETTES.map(p => p.name)
  expect(names).toContain('Black / White')
  expect(names).toContain('Red / Black')
  PRESET_PALETTES.forEach(p => {
    expect(p.palette.bg).toMatch(/^#/)
    expect(p.palette.text).toMatch(/^#/)
    expect(p.palette.accent).toMatch(/^#/)
  })
})

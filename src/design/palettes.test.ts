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

test('Black/White and Red/Black are distinct palettes', () => {
  const bw = PRESET_PALETTES.find(p => p.name === 'Black / White')!
  const rb = PRESET_PALETTES.find(p => p.name === 'Red / Black')!
  // They must differ on at least one channel (bg, text, or accent)
  const same =
    bw.palette.bg === rb.palette.bg &&
    bw.palette.text === rb.palette.text &&
    bw.palette.accent === rb.palette.accent
  expect(same).toBe(false)
})

test('Red/Black has a red background', () => {
  const rb = PRESET_PALETTES.find(p => p.name === 'Red / Black')!
  // bg should be the red ground (#d6231f)
  expect(rb.palette.bg.toLowerCase()).toBe('#d6231f')
})

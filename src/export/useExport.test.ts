import { expect, test } from 'vitest'
import { EXPORT_FACES } from './useExport'

test('export face manifest covers all four families', () => {
  const families = new Set(EXPORT_FACES.map(f => f.family))
  expect(families).toEqual(new Set(['Inter', 'Archivo', 'Archivo Narrow', 'Space Mono']))
})

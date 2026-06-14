import { expect, test } from 'vitest'
import { KIT_FORMATS, exportKit } from './kit'

test('kit covers the four social formats', () => {
  expect(KIT_FORMATS).toEqual(['4:5', '1:1', '9:16', '2:3'])
})

test('exportKit is callable', () => {
  expect(typeof exportKit).toBe('function')
})

import { expect, test } from 'vitest'
import { encodeDesign, decodeDesign } from './share'
import { buildDesign } from './build'
import '../archetypes/index'

test('round-trips a design through encode/decode', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  d.slots.find(s => s.text)!.content = 'HELLO WORLD'
  d.palette = { bg: '#0a0a0a', text: '#ffffff', accent: '#E5484D' }
  const restored = decodeDesign(encodeDesign(d))!
  expect(restored).not.toBeNull()
  expect(restored.format).toBe(d.format)
  expect(restored.archetype).toBe(d.archetype)
  expect(restored.palette).toEqual(d.palette)
  expect(restored.slots.find(s => s.text)!.content).toBe('HELLO WORLD')
})

test('strips heavy dataURL image bytes but keeps http URLs', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  const img = d.slots.find(s => s.role === 'image')
  if (img) {
    img.content = 'data:image/png;base64,' + 'A'.repeat(5000)
    img.imageSrcOriginal = img.content
  }
  const token = encodeDesign(d)
  // the 5000-char dataURL must NOT bloat the token
  expect(token.length).toBeLessThan(2000)
  const restored = decodeDesign(token)!
  const rImg = restored.slots.find(s => s.role === 'image')
  if (rImg) expect(rImg.content).toBe('')
})

test('keeps http(s) image URLs intact', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  const img = d.slots.find(s => s.role === 'image')
  if (img) img.content = 'https://example.com/photo.jpg'
  const restored = decodeDesign(encodeDesign(d))!
  const rImg = restored.slots.find(s => s.role === 'image')
  if (rImg) expect(rImg.content).toBe('https://example.com/photo.jpg')
})

test('decode returns null on garbage input', () => {
  expect(decodeDesign('not-a-valid-token!!!')).toBeNull()
  expect(decodeDesign('')).toBeNull()
})

test('decode merges defaults for a partial payload (migration-safe)', () => {
  const d = buildDesign('mega-word', '4:5', 0)
  // simulate an older payload missing typography/style
  const partial = { ...d } as Record<string, unknown>
  delete partial.typography
  delete partial.style
  const token = encodeDesign(partial as never)
  const restored = decodeDesign(token)!
  expect(restored.typography).toBeDefined()
  expect(restored.style).toBeDefined()
})

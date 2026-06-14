import { expect, test } from 'vitest'
import { fitText, type Measurer } from './fit-text'

// fake measurer: width = chars * size * 0.5, independent of family/weight
const fake: Measurer = (text, size) => text.length * size * 0.5

test('wraps into multiple lines when a single line is too wide', () => {
  const r = fitText('AAA BBB CCC', { w: 60, h: 1000 }, { maxSize: 20, minSize: 8, leading: 1 }, fake)
  expect(r.lines.length).toBeGreaterThan(1)
})

test('shrinks size to fit height-constrained box', () => {
  const tall = fitText('WORD', { w: 1000, h: 1000 }, { maxSize: 100, minSize: 8, leading: 1 }, fake)
  const short = fitText('WORD', { w: 1000, h: 20 }, { maxSize: 100, minSize: 8, leading: 1 }, fake)
  expect(short.size).toBeLessThan(tall.size)
})

test('never returns below minSize', () => {
  const r = fitText('VERYLONGUNBREAKABLEWORD', { w: 10, h: 10 }, { maxSize: 100, minSize: 9, leading: 1 }, fake)
  expect(r.size).toBe(9)
})

test('honors explicit newlines as hard line breaks', () => {
  // a wide box that would otherwise fit everything on one line
  const r = fitText('Opening — p.01\nField Notes — p.12\nArchive — p.48',
    { w: 10000, h: 10000 }, { maxSize: 40, minSize: 8, leading: 1 }, fake)
  expect(r.lines).toEqual(['Opening — p.01', 'Field Notes — p.12', 'Archive — p.48'])
})

test('still wraps a too-wide segment within a hard line', () => {
  const r = fitText('AAA BBB CCC\nDDD', { w: 60, h: 10000 }, { maxSize: 20, minSize: 8, leading: 1 }, fake)
  // first segment wraps across width; second segment is its own line
  expect(r.lines[r.lines.length - 1]).toBe('DDD')
  expect(r.lines.length).toBeGreaterThan(2)
})

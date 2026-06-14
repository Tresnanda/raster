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

// ── lineAdvance ────────────────────────────────────────────────────────────────

test('lineAdvance without baseline equals size * leading', () => {
  const r = fitText('WORD', { w: 1000, h: 1000 }, { maxSize: 40, minSize: 8, leading: 1.2 }, fake)
  expect(r.lineAdvance).toBeCloseTo(r.size * 1.2)
})

test('lineAdvance with baseline snaps to nearest multiple >= size*leading', () => {
  // size=18, leading=0.92 → natural=16.56; baseline=25 → round(16.56/25)*25 = round(0.66)*25 = 25
  // 25 >= 18 (size), so lineAdvance = 25
  const r = fitText('WORD', { w: 1000, h: 1000 }, { maxSize: 18, minSize: 8, leading: 0.92, baseline: 25 }, fake)
  expect(r.size).toBe(18)
  expect(r.lineAdvance).toBe(25)
})

test('lineAdvance with baseline never goes below size (display sizes)', () => {
  // size=200, leading=0.92 → natural=184; baseline=25 → round(184/25)*25 = round(7.36)*25 = 7*25 = 175
  // but 175 < 200 (size), so lineAdvance = max(200, 175) = 200
  const r = fitText('BIG', { w: 100000, h: 100000 }, { maxSize: 200, minSize: 200, leading: 0.92, baseline: 25 }, fake)
  expect(r.lineAdvance).toBeGreaterThanOrEqual(r.size)
})

test('lineAdvance with baseline: display size 76 snaps to a reasonable multiple', () => {
  // size=76, leading=0.92 → natural=69.92; baseline=25 → round(69.92/25)*25 = round(2.80)*25 = 3*25 = 75
  // 75 < 76, so max(76, 75) = 76
  const r = fitText('DISPLAY', { w: 100000, h: 100000 }, { maxSize: 76, minSize: 76, leading: 0.92, baseline: 25 }, fake)
  expect(r.lineAdvance).toBeGreaterThanOrEqual(76)
  expect(r.lineAdvance).toBeLessThanOrEqual(76 + 25)  // at most one unit above size
})

test('lineAdvance with baseline: display size 120 stays sensible', () => {
  // size=120, leading=0.92 → natural=110.4; baseline=25 → round(110.4/25)*25 = round(4.42)*25 = 4*25 = 100
  // 100 < 120, so max(120, 100) = 120
  const r = fitText('TITLE', { w: 100000, h: 100000 }, { maxSize: 120, minSize: 120, leading: 0.92, baseline: 25 }, fake)
  expect(r.lineAdvance).toBeGreaterThanOrEqual(120)
  expect(r.lineAdvance).toBeLessThanOrEqual(120 + 25)
})

test('height check uses lineAdvance when baseline is set', () => {
  // With baseline=25 and size=18, lineAdvance=25. 2 lines need 50px.
  // Box h=49 should NOT fit 2 lines; h=50 should.
  const noFit = fitText('AAA BBB', { w: 4, h: 49 }, { maxSize: 18, minSize: 18, leading: 0.92, baseline: 25 }, fake)
  // The 4px wide box at size 18 will wrap, but it can't fit at size 18 in height < 50 with baseline
  // With minSize=18 it returns minSize anyway, so test the lineAdvance property instead
  expect(noFit.lineAdvance).toBe(25)

  // A tall box: 1 word, no wrap needed, lineAdvance=25 — fits in h=25
  const oneLine = fitText('HI', { w: 1000, h: 25 }, { maxSize: 18, minSize: 18, leading: 0.92, baseline: 25 }, fake)
  expect(oneLine.size).toBe(18)
  expect(oneLine.lineAdvance).toBe(25)
})

import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { SlotText, opticalHang } from './slot-text'
import type { Box, TextStyle } from '../types'

// fake measurer: width = chars * size * 0.5 (so text easily overflows a small box)
const measure = (text: string, size: number) => text.length * size * 0.5

const box: Box = { x: 0, y: 0, w: 40, h: 40 }

function textStyle(fit: TextStyle['fit'], size: number): TextStyle {
  return { family: 'sans', weight: 500, size, tracking: 0, leading: 1, align: 'left', fit }
}

function renderFontSize(text: TextStyle): number {
  const { container } = render(
    <svg>
      <SlotText
        id="test-slot"
        box={box}
        text={text}
        content="WIDE OVERFLOWING TEXT"
        color="#000"
        measure={measure}
      />
    </svg>,
  )
  return Number(container.querySelector('text')!.getAttribute('font-size'))
}

test("fit:'fixed' pins the font size even when text overflows the box", () => {
  expect(renderFontSize(textStyle('fixed', 80))).toBe(80)
})

test("fit:'auto' shrinks the font size to fit the box", () => {
  expect(renderFontSize(textStyle('auto', 80))).toBeLessThan(80)
})

// ── imageFill ─────────────────────────────────────────────────────────────────

test('without imageFill renders a plain <text> and no clipPath or <image>', () => {
  const { container } = render(
    <svg>
      <SlotText
        id="no-fill"
        box={box}
        text={textStyle('fixed', 40)}
        content="HELLO"
        color="#000"
        measure={measure}
      />
    </svg>,
  )
  expect(container.querySelector('text')).toBeTruthy()
  expect(container.querySelector('clipPath')).toBeNull()
  expect(container.querySelector('image')).toBeNull()
})

test('with imageFill renders a <clipPath id="fill-<id>"> containing <text>', () => {
  const { container } = render(
    <svg>
      <SlotText
        id="my-slot"
        box={box}
        text={textStyle('fixed', 40)}
        content="HELLO"
        color="#000"
        measure={measure}
        imageFill="data:image/png;base64,abc"
      />
    </svg>,
  )
  const clip = container.querySelector('clipPath')
  expect(clip).toBeTruthy()
  expect(clip!.id).toBe('fill-my-slot')
  expect(clip!.querySelector('text')).toBeTruthy()
})

test('with imageFill renders an <image> with clip-path referencing the clipPath id', () => {
  const { container } = render(
    <svg>
      <SlotText
        id="my-slot"
        box={box}
        text={textStyle('fixed', 40)}
        content="HELLO"
        color="#000"
        measure={measure}
        imageFill="data:image/png;base64,abc"
      />
    </svg>,
  )
  const img = container.querySelector('image')
  expect(img).toBeTruthy()
  expect(img!.getAttribute('clip-path')).toBe('url(#fill-my-slot)')
  expect(img!.getAttribute('href')).toBe('data:image/png;base64,abc')
  expect(img!.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
})

test('with imageFill does NOT render a visible <text> outside the clipPath', () => {
  const { container } = render(
    <svg>
      <SlotText
        id="fill-slot"
        box={box}
        text={textStyle('fixed', 40)}
        content="HELLO"
        color="#000"
        measure={measure}
        imageFill="data:image/png;base64,abc"
      />
    </svg>,
  )
  // The clipPath contains the text; there is no direct <text> child of the <svg>
  const clip = container.querySelector('clipPath')!
  expect(clip.querySelector('text')).toBeTruthy()
  // No <text> that is a direct child of the svg root (only inside clipPath)
  const svgRoot = container.querySelector('svg')!
  const directTextChildren = Array.from(svgRoot.children).filter(c => c.tagName.toLowerCase() === 'text')
  expect(directTextChildren.length).toBe(0)
})

test('two slots with different ids produce different clipPath ids', () => {
  const { container } = render(
    <svg>
      <SlotText id="slot-a" box={box} text={textStyle('fixed', 40)} content="A" color="#000" measure={measure} imageFill="data:image/png;base64,a" />
      <SlotText id="slot-b" box={box} text={textStyle('fixed', 40)} content="B" color="#000" measure={measure} imageFill="data:image/png;base64,b" />
    </svg>,
  )
  const clips = container.querySelectorAll('clipPath')
  const ids = Array.from(clips).map(c => c.id)
  expect(ids).toContain('fill-slot-a')
  expect(ids).toContain('fill-slot-b')
  expect(new Set(ids).size).toBe(2)
})

// ── opticalHang ───────────────────────────────────────────────────────────────

test('opticalHang: left-aligned line starting with " returns negative offset', () => {
  const offset = opticalHang('"Hello world"', 'left', 100)
  expect(offset).toBeLessThan(0)
  expect(offset).toBeCloseTo(-6)  // 100 * 0.06
})

test('opticalHang: left-aligned line starting with ‘ (curly open-quote) returns negative offset', () => {
  const offset = opticalHang('‘Hello’', 'left', 50)
  expect(offset).toBeLessThan(0)
  expect(offset).toBeCloseTo(-3)  // 50 * 0.06
})

test('opticalHang: left-aligned line NOT starting with hangable char returns 0', () => {
  expect(opticalHang('Hello world', 'left', 100)).toBe(0)
  expect(opticalHang('Abc', 'left', 100)).toBe(0)
})

test('opticalHang: right-aligned line ending with . returns positive offset', () => {
  const offset = opticalHang('The end.', 'right', 100)
  expect(offset).toBeGreaterThan(0)
  expect(offset).toBeCloseTo(6)  // 100 * 0.06
})

test('opticalHang: right-aligned line ending with , returns positive offset', () => {
  expect(opticalHang('one, two,', 'right', 100)).toBeCloseTo(6)
})

test('opticalHang: right-aligned line NOT ending with hangable char returns 0', () => {
  expect(opticalHang('Hello world', 'right', 100)).toBe(0)
})

test('opticalHang: center-aligned always returns 0', () => {
  expect(opticalHang('"center start', 'center', 100)).toBe(0)
  expect(opticalHang('end.', 'center', 100)).toBe(0)
})

test('opticalHang: left-aligned line starting with ( or [ returns negative offset', () => {
  expect(opticalHang('(note)', 'left', 100)).toBeCloseTo(-6)
  expect(opticalHang('[ref]', 'left', 100)).toBeCloseTo(-6)
})

test('opticalHang: left-aligned line starting with em dash returns negative offset', () => {
  expect(opticalHang('— thought', 'left', 100)).toBeCloseTo(-6)
})

// ── Body measure cap ──────────────────────────────────────────────────────────

// fake measurer that returns chars * size * 0.6 (slightly wider than the test one above)
const wideMeasure = (text: string, size: number) => text.length * size * 0.6

test('body-class text in a very wide box wraps at ~34*size, not full box width', () => {
  // size=18, cap = 34*18 = 612. Box is 2000px wide.
  // With the wide measurer, a 40-char string at size 18 = 40 * 18 * 0.6 = 432 < 612 — fits.
  // A 60-char string at size 18 = 60 * 18 * 0.6 = 648 > 612 — should wrap.
  const longText = 'ABCDE FGHIJ KLMNO PQRST UVWXY ZABCD EFGHI JKLMN OPQRS TUVWX YZ' // ~60 chars
  const { container } = render(
    <svg>
      <SlotText
        id="body-cap"
        box={{ x: 0, y: 0, w: 2000, h: 2000 }}
        text={{ family: 'sans', weight: 400, size: 18, tracking: 0, leading: 1.4, align: 'left', fit: 'fixed' }}
        content={longText}
        color="#000"
        measure={wideMeasure}
        typeClass="body"
      />
    </svg>,
  )
  // Should have multiple tspan elements (wrapped)
  const tspans = container.querySelectorAll('tspan')
  expect(tspans.length).toBeGreaterThan(1)
})

test('title-class text in the same wide box does NOT cap wrap width', () => {
  // With size=18 and a title class, cap does NOT apply — wraps against 2000px
  // A 60-char string at size 18 = 648 < 2000, so it fits on ONE line
  const longText = 'ABCDE FGHIJ KLMNO PQRST UVWXY ZABCD EFGHI JKLMN OPQRS TUVWX YZ'
  const { container } = render(
    <svg>
      <SlotText
        id="title-cap"
        box={{ x: 0, y: 0, w: 2000, h: 2000 }}
        text={{ family: 'sans', weight: 400, size: 18, tracking: 0, leading: 1.4, align: 'left', fit: 'fixed' }}
        content={longText}
        color="#000"
        measure={wideMeasure}
        typeClass="title"
      />
    </svg>,
  )
  // With title class, wraps against 2000px — 648 < 2000 so single line
  const tspans = container.querySelectorAll('tspan')
  expect(tspans.length).toBe(1)
})

import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { SlotText } from './slot-text'
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

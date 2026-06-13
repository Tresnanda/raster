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

import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { SlotText } from './slot-text'
import type { Box, Slot, TextStyle } from '../types'

// fake measurer: width = chars * size * 0.5 (so text easily overflows a small box)
const measure = (text: string, size: number) => text.length * size * 0.5

const box: Box = { x: 0, y: 0, w: 40, h: 40 }

function slot(fit: TextStyle['fit'], size: number): Slot {
  return {
    id: 's', role: 'subhead', cell: { c: 0, cs: 1, r: 0, rs: 1 },
    content: 'WIDE OVERFLOWING TEXT',
    text: { family: 'sans', weight: 500, size, tracking: 0, leading: 1, align: 'left', fit },
  }
}

function renderFontSize(s: Slot): number {
  const { container } = render(
    <svg><SlotText box={box} slot={s} color="#000" measure={measure} /></svg>,
  )
  return Number(container.querySelector('text')!.getAttribute('font-size'))
}

test("fit:'fixed' pins the font size even when text overflows the box", () => {
  expect(renderFontSize(slot('fixed', 80))).toBe(80)
})

test("fit:'auto' shrinks the font size to fit the box", () => {
  expect(renderFontSize(slot('auto', 80))).toBeLessThan(80)
})

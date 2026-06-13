// src/ui/sidebar/CanvasChips.test.tsx
import { beforeEach, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasChips } from './CanvasChips'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().setFormat('4:5')
})

test('renders all 7 format options', () => {
  render(<CanvasChips />)
  for (const f of ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']) {
    expect(screen.getByText(f)).toBeTruthy()
  }
})

test('active format segment has bg-neutral-900 class', () => {
  render(<CanvasChips />)
  const activeBtn = screen.getByText('4:5').closest('button')
  expect(activeBtn?.className).toContain('bg-neutral-900')
})

test('clicking 1:1 sets format to 1:1', () => {
  render(<CanvasChips />)
  fireEvent.click(screen.getByText('1:1'))
  expect(useDesign.getState().design.format).toBe('1:1')
})

test('segmented control has radiogroup role', () => {
  const { container } = render(<CanvasChips />)
  expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
})

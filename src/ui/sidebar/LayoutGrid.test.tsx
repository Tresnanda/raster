// src/ui/sidebar/LayoutGrid.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayoutGrid } from './LayoutGrid'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().setLayout(1)
})

test('Shuffle button calls shuffle()', () => {
  const shuffle = vi.spyOn(useDesign.getState(), 'shuffle')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Rearrange this layout'))
  expect(shuffle).toHaveBeenCalled()
})

test('Pick for me button calls pickForMe()', () => {
  const pickForMe = vi.spyOn(useDesign.getState(), 'pickForMe')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Jump to a random preset layout'))
  expect(pickForMe).toHaveBeenCalled()
})

test('Surprise me button calls surprise()', () => {
  const surprise = vi.spyOn(useDesign.getState(), 'surprise')
  render(<LayoutGrid />)
  fireEvent.click(screen.getByTitle('Generate a brand-new unique design'))
  expect(surprise).toHaveBeenCalled()
})

test('three buttons are visually distinct — Surprise has primary class', () => {
  const { container } = render(<LayoutGrid />)
  const surpriseBtn = container.querySelector('[title="Generate a brand-new unique design"]')
  expect(surpriseBtn?.className).toContain('bg-neutral-900')
})

test('microcopy helper is rendered', () => {
  render(<LayoutGrid />)
  expect(screen.getByText(/Shuffle reworks this layout/i)).toBeTruthy()
})

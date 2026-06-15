// src/ui/sidebar/LayoutGrid.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayoutGrid } from './LayoutGrid'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

beforeEach(() => {
  useDesign.getState().setLayout(1)
  useDesign.setState({ shuffleScope: 'all' } as any)
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

test('shuffle scope buttons switch between all, content, and system', () => {
  render(<LayoutGrid />)
  fireEvent.click(screen.getByRole('button', { name: /copy scope/i }))
  expect(useDesign.getState().shuffleScope).toBe('content')
  fireEvent.click(screen.getByRole('button', { name: /system scope/i }))
  expect(useDesign.getState().shuffleScope).toBe('system')
  fireEvent.click(screen.getByRole('button', { name: /all scope/i }))
  expect(useDesign.getState().shuffleScope).toBe('all')
})

test('three buttons are visually distinct — Surprise has primary (ink) class', () => {
  const { container } = render(<LayoutGrid />)
  const surpriseBtn = container.querySelector('[title="Generate a brand-new unique design"]')
  // In ink brutalism, Surprise is the default (primary) variant — bg-primary (carbon ink)
  expect(surpriseBtn?.className).toContain('bg-primary')
})

test('microcopy helper is rendered', () => {
  render(<LayoutGrid />)
  expect(screen.getByText(/Shuffle reworks/i)).toBeTruthy()
})

import { expect, test, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { CommandPalette } from './CommandPalette'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

beforeEach(() => {
  useDesign.getState().setCommandOpen(false)
})

test('setCommandOpen toggles the palette open flag', () => {
  expect(useDesign.getState().commandOpen).toBe(false)
  useDesign.getState().setCommandOpen(true)
  expect(useDesign.getState().commandOpen).toBe(true)
})

test('renders command groups + items when open', () => {
  const ref = createRef<SVGSVGElement>()
  useDesign.getState().setCommandOpen(true)
  render(<CommandPalette svgRef={ref} />)
  expect(screen.getByText('Shuffle layout')).toBeInTheDocument()
  expect(screen.getByText('Surprise — generate new')).toBeInTheDocument()
  expect(screen.getByText('Copy share link')).toBeInTheDocument()
})

test('does not render the dialog content when closed', () => {
  const ref = createRef<SVGSVGElement>()
  useDesign.getState().setCommandOpen(false)
  render(<CommandPalette svgRef={ref} />)
  expect(screen.queryByText('Shuffle layout')).toBeNull()
})

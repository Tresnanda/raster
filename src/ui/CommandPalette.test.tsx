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

// Note: cmdk's Radix-Dialog popup does not mount cleanly in jsdom (internal store
// "subscribe" error) — its open-state rendering is verified via the production
// build + manual testing, not here.

test('does not render the dialog content when closed', () => {
  const ref = createRef<SVGSVGElement>()
  useDesign.getState().setCommandOpen(false)
  render(<CommandPalette svgRef={ref} />)
  expect(screen.queryByText('Shuffle layout')).toBeNull()
})

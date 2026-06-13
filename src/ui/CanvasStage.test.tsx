import { expect, test } from 'vitest'
import { render, act } from '@testing-library/react'
import { CanvasStage } from './CanvasStage'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

test('renders the current design as an svg', () => {
  useDesign.getState().reset('mega-word', '1:1')
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { container } = render(<CanvasStage svgRef={svgRef} />)
  expect(container.querySelector('svg')).toBeTruthy()
})

test('does not throw when layout changes (motion reflow hook)', () => {
  useDesign.getState().setLayout(1)
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { unmount } = render(<CanvasStage svgRef={svgRef} />)
  // Change layout — triggers reflow hook dependency; should not throw
  act(() => {
    useDesign.getState().setLayout(2)
  })
  unmount()
})

test('store snap defaults to true', () => {
  expect(useDesign.getState().snap).toBe(true)
})

test('setSnap updates store snap', () => {
  useDesign.getState().setSnap(false)
  expect(useDesign.getState().snap).toBe(false)
  useDesign.getState().setSnap(true)
})

// ── Phase E motion smoke tests ────────────────────────────────────────────────

test('add-element pop: adding an element does not throw (motion hook fires)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { unmount } = render(<CanvasStage svgRef={svgRef} />)
  // Adding an element increments slots.length, triggering the pop hook
  act(() => {
    useDesign.getState().addElement('text')
  })
  unmount()
})

test('surprise entrance amplification: surprise() does not throw (motion reflow detects generated archetype)', () => {
  useDesign.getState().reset('mega-word', '4:5')
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { unmount } = render(<CanvasStage svgRef={svgRef} />)
  act(() => {
    useDesign.getState().surprise()
  })
  unmount()
})

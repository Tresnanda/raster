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

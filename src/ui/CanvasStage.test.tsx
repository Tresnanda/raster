import { expect, test } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
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

// ── ZoomHUD tests ──────────────────────────────────────────────────────────────

test('ZoomHUD renders with default zoom percentage', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().zoomToFit() // ensure zoom is 1
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { container } = render(<CanvasStage svgRef={svgRef} />)
  const hud = container.querySelector('[data-zoom-hud]')
  expect(hud).toBeTruthy()
  expect(hud!.textContent).toContain('100%')
})

test('clicking + in ZoomHUD increases zoom', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().zoomToFit()
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { getByLabelText, unmount } = render(<CanvasStage svgRef={svgRef} />)
  act(() => {
    getByLabelText('Zoom in').click()
  })
  expect(useDesign.getState().zoom).toBeGreaterThan(1)
  unmount()
})

test('clicking Fit resets zoom to 1', () => {
  useDesign.getState().reset('mega-word', '1:1')
  act(() => { useDesign.getState().setZoom(3) })
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { getByLabelText, unmount } = render(<CanvasStage svgRef={svgRef} />)
  act(() => {
    getByLabelText('Fit').click()
  })
  expect(useDesign.getState().zoom).toBe(1)
  unmount()
})

test('ComposerOverlay still renders at non-1 zoom', () => {
  useDesign.getState().reset('mega-word', '1:1')
  act(() => { useDesign.getState().setZoom(2) })
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { container, unmount } = render(<CanvasStage svgRef={svgRef} />)
  // ComposerOverlay renders with data-composer-overlay attribute
  const overlay = container.querySelector('[data-composer-overlay]')
  expect(overlay).toBeTruthy()
  unmount()
})

test('dragging from top ruler creates a vertical guide at release position', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().clearGuides()
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { container, unmount } = render(<CanvasStage svgRef={svgRef} />)
  const topRuler = container.querySelector('[data-ruler-top]') as HTMLElement
  const canvasBox = topRuler.parentElement as HTMLElement
  canvasBox.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    right: 100,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })

  act(() => {
    fireEvent.pointerDown(topRuler, { clientX: 10, clientY: -10, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 80, clientY: -10, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 80, clientY: -10, pointerId: 1 })
  })

  expect(useDesign.getState().guides).toEqual([{ axis: 'x', pos: 864 }])
  unmount()
})

test('clicking a guide handle removes the guide', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().clearGuides()
  act(() => {
    useDesign.getState().addGuide({ axis: 'x', pos: 120 })
    useDesign.getState().addGuide({ axis: 'y', pos: 220 })
  })
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { getByLabelText, unmount } = render(<CanvasStage svgRef={svgRef} />)

  act(() => {
    fireEvent.click(getByLabelText('Remove vertical guide at 120'))
  })

  expect(useDesign.getState().guides).toEqual([{ axis: 'y', pos: 220 }])
  unmount()
})

test('guide remove marker is compact and visually quiet', () => {
  useDesign.getState().reset('mega-word', '1:1')
  useDesign.getState().clearGuides()
  act(() => {
    useDesign.getState().addGuide({ axis: 'x', pos: 120 })
  })
  const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>
  const { getByLabelText, unmount } = render(<CanvasStage svgRef={svgRef} />)
  const handle = getByLabelText('Remove vertical guide at 120') as HTMLElement
  const marker = handle.querySelector('[data-guide-handle-marker]') as HTMLElement

  expect(marker).toBeTruthy()
  expect(Number.parseFloat(marker.style.width)).toBeLessThanOrEqual(10)
  expect(marker.style.boxShadow).toBe('none')
  expect(marker.style.border).toContain('rgba')
  expect(handle.style.background).toBe('transparent')
  expect(handle.style.borderWidth).toBe('0px')
  unmount()
})

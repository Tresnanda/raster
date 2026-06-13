// src/ui/sidebar/Sidebar.test.tsx
import { beforeEach, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'
import React from 'react'

const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>

beforeEach(() => {
  useDesign.getState().setLayout(1)
})

test('renders all 19 layout cells', () => {
  render(<Sidebar svgRef={svgRef} />)
  // Each cell shows its number as text
  for (let n = 1; n <= 19; n++) {
    expect(screen.getAllByText(String(n)).length).toBeGreaterThan(0)
  }
})

test('clicking layout cell 3 changes design.layout to 3', () => {
  render(<Sidebar svgRef={svgRef} />)
  // Find the button whose accessible text is "3" inside the layout grid
  const cells = screen.getAllByText('3')
  // The layout grid button is a <button> element
  const cell = cells.find(el => el.tagName === 'BUTTON')
  expect(cell).toBeTruthy()
  fireEvent.click(cell!)
  expect(useDesign.getState().design.layout).toBe(3)
})

test('content textarea edits slot content', () => {
  useDesign.getState().setLayout(3) // mega-word has a 'word' slot
  render(<Sidebar svgRef={svgRef} />)
  // Look for any textarea (content field)
  const textareas = document.querySelectorAll('textarea')
  expect(textareas.length).toBeGreaterThan(0)
  const first = textareas[0] as HTMLTextAreaElement
  const slotIdBefore = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block',
  )?.id
  fireEvent.change(first, { target: { value: 'CHANGED' } })
  const slot = useDesign.getState().design.slots.find(s => s.id === slotIdBefore)
  expect(slot?.content).toBe('CHANGED')
})

test('style checkbox toggles design.style', () => {
  render(<Sidebar svgRef={svgRef} />)
  const filmGrainLabel = screen.getByLabelText('Film grain') as HTMLInputElement
  const before = useDesign.getState().design.style.filmGrain
  fireEvent.click(filmGrainLabel)
  expect(useDesign.getState().design.style.filmGrain).toBe(!before)
})

import { expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SlotInspector } from './SlotInspector'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

test('editing a text field updates slot content', () => {
  useDesign.getState().reset('mega-word', '4:5')
  render(<SlotInspector />)
  const ta = screen.getByLabelText('word') as HTMLTextAreaElement
  fireEvent.change(ta, { target: { value: 'NEW' } })
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.content).toBe('NEW')
})

test('renders an archetype with a block slot (modular-bento) without crashing', () => {
  useDesign.getState().reset('modular-bento', '4:5')
  render(<SlotInspector />)
  // the block slot shows a decorative note instead of text controls
  expect(screen.getByText(/Decorative block/i)).toBeInTheDocument()
})

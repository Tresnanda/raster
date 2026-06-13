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

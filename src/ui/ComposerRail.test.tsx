// src/ui/ComposerRail.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComposerRail } from './ComposerRail'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().selectElement(null)
  useDesign.getState().setSnap(true)
})

// ── Add buttons ───────────────────────────────────────────────────────────────

test('renders all four Add buttons', () => {
  render(<ComposerRail />)
  expect(screen.getByLabelText('Add text element')).toBeTruthy()
  expect(screen.getByLabelText('Add image element')).toBeTruthy()
  expect(screen.getByLabelText('Add shape element')).toBeTruthy()
  expect(screen.getByLabelText('Add line element')).toBeTruthy()
})

test('clicking "+ Text" calls addElement with "text"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add text element'))
  expect(addElement).toHaveBeenCalledWith('text')
})

test('clicking "+ Image" calls addElement with "image"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add image element'))
  expect(addElement).toHaveBeenCalledWith('image')
})

test('clicking "+ Shape" calls addElement with "block"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add shape element'))
  expect(addElement).toHaveBeenCalledWith('block')
})

test('clicking "+ Line" calls addElement with "line"', () => {
  const addElement = vi.spyOn(useDesign.getState(), 'addElement')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Add line element'))
  expect(addElement).toHaveBeenCalledWith('line')
})

// ── Layers list ───────────────────────────────────────────────────────────────

test('layers list renders a row per slot', () => {
  const { container } = render(<ComposerRail />)
  const slotCount = useDesign.getState().design.slots.length
  const rows = container.querySelectorAll('[data-layer-row]')
  expect(rows.length).toBe(slotCount)
})

test('clicking a layer row selects that element', () => {
  const { container } = render(<ComposerRail />)
  const firstRow = container.querySelector('[data-layer-row]') as HTMLElement
  const slotId = firstRow.getAttribute('data-layer-row')!
  fireEvent.click(firstRow)
  expect(useDesign.getState().selectedId).toBe(slotId)
})

// ── Snap toggle ───────────────────────────────────────────────────────────────

test('snap checkbox reflects store snap (defaults true)', () => {
  const { container } = render(<ComposerRail />)
  const checkbox = container.querySelector('[data-rail-checkbox="rail-snap"]') as HTMLInputElement
  expect(checkbox.checked).toBe(true)
})

test('clicking snap checkbox calls setSnap with toggled value', () => {
  const setSnap = vi.spyOn(useDesign.getState(), 'setSnap')
  render(<ComposerRail />)
  const label = screen.getByLabelText('Snap to grid')
  fireEvent.click(label)
  expect(setSnap).toHaveBeenCalledWith(false)
})

// ── Selected element panel ────────────────────────────────────────────────────

test('empty state shown when nothing selected', () => {
  render(<ComposerRail />)
  expect(screen.getByText('Select an element on the canvas to edit it.')).toBeTruthy()
})

test('selecting a text element shows align buttons', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Align left')).toBeTruthy()
  expect(screen.getByLabelText('Align center')).toBeTruthy()
  expect(screen.getByLabelText('Align right')).toBeTruthy()
})

test('align left button calls setText with align:left', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const setText = vi.spyOn(useDesign.getState(), 'setText')
  render(<ComposerRail />)
  fireEvent.click(screen.getByLabelText('Align left'))
  expect(setText).toHaveBeenCalledWith(textSlot.id, { align: 'left' })
})

// ── Rich inspector ─────────────────────────────────────────────────────────────

test('selecting a text element shows Typeface select', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Typeface')).toBeTruthy()
})

test('selecting a text element shows Tracking input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Tracking')).toBeTruthy()
})

test('selecting a text element shows Leading input', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Leading')).toBeTruthy()
})

test('selecting a text element shows Weight select', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Weight')).toBeTruthy()
})

test('changing Size input calls overrideText with size and fit:fixed', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const overrideText = vi.spyOn(useDesign.getState(), 'overrideText')
  render(<ComposerRail />)
  const sizeInput = screen.getByLabelText('Size') as HTMLInputElement
  fireEvent.change(sizeInput, { target: { value: '200' } })
  expect(overrideText).toHaveBeenCalledWith(textSlot.id, { size: 200, fit: 'fixed' })
})

test('changing Typeface select calls overrideText with family', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  const overrideText = vi.spyOn(useDesign.getState(), 'overrideText')
  render(<ComposerRail />)
  const typefaceSelect = screen.getByLabelText('Typeface') as HTMLSelectElement
  fireEvent.change(typefaceSelect, { target: { value: 'mono' } })
  expect(overrideText).toHaveBeenCalledWith(textSlot.id, { family: 'mono' })
})

test('selecting an image element shows B&W checkbox', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('Black & white')).toBeTruthy()
})

test('toggling B&W checkbox on image calls setBw', () => {
  useDesign.getState().addElement('image')
  const imgSlot = useDesign.getState().design.slots.find(s => s.role === 'image')!
  useDesign.getState().selectElement(imgSlot.id)
  const setBw = vi.spyOn(useDesign.getState(), 'setBw')
  render(<ComposerRail />)
  const bwLabel = screen.getByLabelText('Black & white')
  fireEvent.click(bwLabel)
  expect(setBw).toHaveBeenCalled()
})

test('selecting a shape element shows Fill: Accent and Text buttons', () => {
  useDesign.getState().addElement('block')
  const blockSlot = useDesign.getState().design.slots.find(s => s.role === 'block')!
  useDesign.getState().selectElement(blockSlot.id)
  render(<ComposerRail />)
  // Find all buttons with name matching /accent/i and /text/i
  // (there may be multiple due to other UI elements like "Add text element")
  const accentBtns = screen.getAllByRole('button', { name: /accent/i })
  expect(accentBtns.length).toBeGreaterThan(0)
  const textBtns = screen.getAllByRole('button', { name: /text/i })
  expect(textBtns.length).toBeGreaterThan(0)
})

test('position inputs are shown for selected element', () => {
  const textSlot = useDesign.getState().design.slots.find(
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line'
  )!
  useDesign.getState().selectElement(textSlot.id)
  render(<ComposerRail />)
  expect(screen.getByLabelText('X position')).toBeTruthy()
  expect(screen.getByLabelText('Y position')).toBeTruthy()
  expect(screen.getByLabelText('Width')).toBeTruthy()
  expect(screen.getByLabelText('Height')).toBeTruthy()
})

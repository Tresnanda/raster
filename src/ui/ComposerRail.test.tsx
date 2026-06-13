// src/ui/ComposerRail.test.tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComposerRail } from './ComposerRail'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'
import React from 'react'

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

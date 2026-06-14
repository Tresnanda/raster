// src/ui/RiffModal.test.tsx
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RiffModal } from './RiffModal'
import { LayoutGrid } from './sidebar/LayoutGrid'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

beforeEach(() => {
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.getState().closeRiff()
  // Reset the riff tree
  useDesign.setState({
    riffTree: { nodes: {}, rootId: null, currentId: null },
    riffStrength: 0.5,
  })
})

// ---------------------------------------------------------------------------
// RiffModal rendering
// ---------------------------------------------------------------------------

describe('RiffModal', () => {
  test('does not render when riffOpen is false', () => {
    const { container } = render(<RiffModal />)
    expect(container.querySelector('[aria-modal="true"]')).toBeNull()
  })

  test('renders 9 variation cards when open', () => {
    act(() => { useDesign.getState().openRiff() })
    const { container } = render(<RiffModal />)
    // 9 buttons inside the grid (skip the header/footer buttons)
    const cards = container.querySelectorAll('[title^="Apply variation"]')
    expect(cards.length).toBe(9)
  })

  test('clicking a card calls applyRiff and renders new grid', () => {
    act(() => { useDesign.getState().openRiff() })
    const applyRiff = vi.spyOn(useDesign.getState(), 'applyRiff')
    const { container } = render(<RiffModal />)
    const firstCard = container.querySelector('[title^="Apply variation"]') as HTMLElement
    fireEvent.click(firstCard)
    expect(applyRiff).toHaveBeenCalledOnce()
  })

  test('Reroll button triggers variant regeneration without calling applyRiff', () => {
    act(() => { useDesign.getState().openRiff() })
    const applyRiff = vi.spyOn(useDesign.getState(), 'applyRiff')
    render(<RiffModal />)
    // Clear any calls that happened during initial render effects
    applyRiff.mockClear()
    const rerollBtn = screen.getByTitle('Generate 9 new variations')
    fireEvent.click(rerollBtn)
    expect(applyRiff).not.toHaveBeenCalled()
  })

  test('strength slider calls setRiffStrength', () => {
    act(() => { useDesign.getState().openRiff() })
    const setRiffStrength = vi.spyOn(useDesign.getState(), 'setRiffStrength')
    render(<RiffModal />)
    const slider = screen.getByRole('slider', { name: /mutation strength/i })
    fireEvent.change(slider, { target: { value: '0.8' } })
    expect(setRiffStrength).toHaveBeenCalledWith(0.8)
  })

  test('Done button closes the modal', () => {
    act(() => { useDesign.getState().openRiff() })
    render(<RiffModal />)
    const doneBtn = screen.getByText('Done')
    fireEvent.click(doneBtn)
    expect(useDesign.getState().riffOpen).toBe(false)
  })

  test('Escape key closes the modal', () => {
    act(() => { useDesign.getState().openRiff() })
    render(<RiffModal />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useDesign.getState().riffOpen).toBe(false)
  })

  test('lineage strip is shown after picking a variation', () => {
    act(() => { useDesign.getState().openRiff() })
    const { container } = render(<RiffModal />)
    // Seed the riff tree manually so root + current are set
    act(() => {
      useDesign.getState().seedRiff()
      const variant = { ...useDesign.getState().design, seed: 7777 }
      useDesign.getState().applyRiff(variant)
    })
    // Re-render after state change — lineage strip should now appear
    const strip = container.querySelector('[title="Root design"]')
    expect(strip).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// LayoutGrid Riff button
// ---------------------------------------------------------------------------

describe('LayoutGrid Riff button', () => {
  test('Riff button is present in LayoutGrid', () => {
    render(<LayoutGrid />)
    const riffBtn = screen.getByTitle('Open variation explorer — mutate and evolve the current design')
    expect(riffBtn).toBeTruthy()
  })

  test('clicking Riff button opens the modal via openRiff', () => {
    const openRiff = vi.spyOn(useDesign.getState(), 'openRiff')
    render(<LayoutGrid />)
    const riffBtn = screen.getByTitle('Open variation explorer — mutate and evolve the current design')
    fireEvent.click(riffBtn)
    expect(openRiff).toHaveBeenCalled()
  })
})

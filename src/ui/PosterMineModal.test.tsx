import { beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PosterMineModal } from './PosterMineModal'
import { useDesign } from '../store/useDesign'
import '../archetypes/index'

beforeEach(() => {
  localStorage.clear()
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.setState({ mineOpen: false, savedPosters: [], posterMineError: null })
})

test('PosterMineModal stays hidden until opened', () => {
  const { container } = render(<PosterMineModal />)
  expect(container.querySelector('[aria-label="Poster Mine"]')).toBeNull()
})

test('PosterMineModal renders saved posters and can load one', () => {
  useDesign.getState().setContent('word', 'ARCHIVED')
  const saved = useDesign.getState().saveCurrentPoster('manual')
  useDesign.getState().setContent('word', 'CURRENT')
  useDesign.getState().openMine()

  render(<PosterMineModal />)
  expect(screen.getByText('Poster Mine')).toBeInTheDocument()
  expect(saved).not.toBeNull()
  expect(screen.getAllByText(saved!.title).length).toBeGreaterThan(0)

  fireEvent.click(screen.getByRole('button', { name: `Load ${saved!.title}` }))
  expect(useDesign.getState().design.slots.find(s => s.id === 'word')!.content).toBe('ARCHIVED')
})

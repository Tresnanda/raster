import React from 'react'
import { beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PosterMineControls } from './PosterMineControls'
import { DailyBriefControls } from './DailyBriefControls'
import { SystemRecipeControls } from './SystemRecipeControls'
import { GridCoachControls } from './GridCoachControls'
import { SeriesControls } from './SeriesControls'
import { MotionControls } from './MotionControls'
import { ArrangeControls } from './ArrangeControls'
import { TypographyControls } from './TypographyControls'
import { StyleControls } from './StyleControls'
import { ComponentsControls } from './ComponentsControls'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>

beforeEach(() => {
  localStorage.clear()
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.setState({
    mineOpen: false,
    savedPosters: [],
    posterMineError: null,
    systemRecipes: [],
    campaignRaw: '',
    campaignItems: [],
    activeCampaignId: null,
    dailyBrief: null,
    dailyStreak: { current: 0, longest: 0, lastDate: null },
    componentLibrary: [],
    guides: [],
    motionSequence: {
      effect: 'rise',
      tempo: 100,
      delayMs: 0,
      staggerMs: 80,
      loop: false,
    },
  } as any)
})

test('PosterMineControls saves the current design and opens the mine', () => {
  render(<PosterMineControls />)
  expect(screen.getByText(/saved snapshots/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /save to mine/i }))
  expect(useDesign.getState().savedPosters).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /open mine/i }))
  expect(useDesign.getState().mineOpen).toBe(true)
})

test('PosterMineControls pins a snapshot checkpoint', () => {
  render(<PosterMineControls />)
  fireEvent.click(screen.getByRole('button', { name: /pin snapshot/i }))
  expect(useDesign.getState().savedPosters[0].source).toBe('snapshot')
})

test('DailyBriefControls starts the deterministic daily brief', () => {
  render(<DailyBriefControls today="2026-06-14" />)
  fireEvent.click(screen.getByRole('button', { name: /start brief/i }))
  expect(useDesign.getState().dailyBrief?.date).toBe('2026-06-14')
  expect(useDesign.getState().savedPosters[0].source).toBe('daily')
  expect(screen.getByText(/1-day streak/i)).toBeInTheDocument()
  expect(screen.getByText(/done today/i)).toBeInTheDocument()
})

test('ArrangeControls runs Auto-tidy on the current poster', () => {
  useDesign.getState().setBox('word', { x: 650, y: 520, w: 420, h: 150 })
  render(<ArrangeControls />)
  fireEvent.click(screen.getByRole('button', { name: /auto-tidy/i }))
  expect(useDesign.getState().design.slots.find(slot => slot.id === 'word')!.box).toBeUndefined()
})

test('TypographyControls applies curated type systems', () => {
  render(<TypographyControls />)
  fireEvent.click(screen.getByRole('button', { name: /apply Mono Technical/i }))
  expect(useDesign.getState().design.typography.typeface).toBe('mono')
})

test('StyleControls exposes palette extraction from an image', () => {
  render(<StyleControls />)
  expect(screen.getByRole('button', { name: /pull palette from image/i })).toBeInTheDocument()
})

test('ComponentsControls saves and inserts selected components', () => {
  useDesign.getState().setSelection(['word', 'subhead'])
  render(<ComponentsControls />)
  fireEvent.click(screen.getByRole('button', { name: /save selected component/i }))
  expect(useDesign.getState().componentLibrary).toHaveLength(1)
  const before = useDesign.getState().design.slots.length
  fireEvent.click(screen.getByRole('button', { name: /insert selection group/i }))
  expect(useDesign.getState().design.slots.length).toBeGreaterThan(before)
})

test('SystemRecipeControls saves and applies a recipe', () => {
  render(<SystemRecipeControls />)
  fireEvent.change(screen.getByLabelText(/recipe name/i), { target: { value: 'Black Sprint' } })
  fireEvent.click(screen.getByRole('button', { name: /save system/i }))
  expect(useDesign.getState().systemRecipes[0].name).toBe('Black Sprint')
  fireEvent.click(screen.getByRole('button', { name: /apply Black Sprint/i }))
  expect(useDesign.getState().design.palette).toEqual(useDesign.getState().systemRecipes[0].palette)
})

test('GridCoachControls exposes a score and one-click contrast fix', () => {
  useDesign.getState().setPalette({ bg: '#111111', text: '#181818', accent: '#222222' })
  render(<GridCoachControls />)
  expect(screen.getByText(/Swiss score/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /increase contrast/i }))
  expect(useDesign.getState().design.palette.text).toBe('#ffffff')
})

test('SeriesControls builds an editable campaign board', () => {
  render(<SeriesControls />)
  expect(screen.getByText(/campaign board/i)).toBeInTheDocument()
  fireEvent.change(screen.getByPlaceholderText(/One per line/i), { target: { value: 'One\nTwo' } })
  fireEvent.click(screen.getByRole('button', { name: /build campaign/i }))
  expect(useDesign.getState().campaignItems).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: /load Two/i }))
  expect(useDesign.getState().activeCampaignId).toBe('campaign-2')
})

test('MotionControls updates Motion Lab sequence tempo', () => {
  render(<MotionControls svgRef={svgRef} />)
  fireEvent.change(screen.getByLabelText(/tempo/i), { target: { value: '150' } })
  expect(useDesign.getState().motionSequence.tempo).toBe(150)
})

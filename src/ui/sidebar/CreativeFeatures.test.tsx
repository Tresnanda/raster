import React from 'react'
import { beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PosterMineControls } from './PosterMineControls'
import { DailyBriefControls } from './DailyBriefControls'
import { SystemRecipeControls } from './SystemRecipeControls'
import { GridCoachControls } from './GridCoachControls'
import { SeriesControls } from './SeriesControls'
import { MotionControls } from './MotionControls'
import { useDesign } from '../../store/useDesign'
import '../../archetypes/index'

const svgRef = { current: null } as React.RefObject<SVGSVGElement | null>

beforeEach(() => {
  localStorage.clear()
  useDesign.getState().reset('mega-word', '4:5')
  useDesign.setState({
    mineOpen: false,
    savedPosters: [],
    systemRecipes: [],
    campaignRaw: '',
    campaignItems: [],
    activeCampaignId: null,
    dailyBrief: null,
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

test('DailyBriefControls starts the deterministic daily brief', () => {
  render(<DailyBriefControls today="2026-06-14" />)
  fireEvent.click(screen.getByRole('button', { name: /start brief/i }))
  expect(useDesign.getState().dailyBrief?.date).toBe('2026-06-14')
  expect(useDesign.getState().savedPosters[0].source).toBe('daily')
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

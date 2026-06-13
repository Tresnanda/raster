import { expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { Renderer } from './Renderer'
import { buildDesign } from '../design/build'
import '../archetypes/index'

const measure = (t: string, s: number) => t.length * s * 0.5

test('renders an svg with the canvas viewBox', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const { container } = render(<Renderer design={d} measure={measure} />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('0 0 1080 1080')
})

test('renders a background rect with palette bg', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const { container } = render(<Renderer design={d} measure={measure} />)
  const bg = container.querySelector('rect[data-bg]')!
  expect(bg.getAttribute('fill')).toBe('#0a0a0a')
})

test('text slot with content renders <text> lines', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.slots.find(s => s.id === 'word')!.content = 'RUN MELB'
  const { container } = render(<Renderer design={d} measure={measure} />)
  expect(container.querySelector('text')).toBeTruthy()
})

test('image slot with src renders <image> with cover', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.slots.find(s => s.id === 'image')!.content = 'data:image/png;base64,xx'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector('image')!
  expect(img.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
})

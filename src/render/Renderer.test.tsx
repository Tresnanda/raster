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

test('slots are wrapped in <g data-slot>', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const { container } = render(<Renderer design={d} measure={measure} />)
  const slotGroups = container.querySelectorAll('[data-slot]')
  expect(slotGroups.length).toBeGreaterThan(0)
})

test('background rect is not inside a data-slot group', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const { container } = render(<Renderer design={d} measure={measure} />)
  const bg = container.querySelector('rect[data-bg]')!
  expect(bg.closest('[data-slot]')).toBeNull()
})

test('style.bwImage: image gets bw filter applied', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.slots.find(s => s.id === 'image')!.content = 'data:image/png;base64,xx'
  d.style.bwImage = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector('image')!
  expect(img.getAttribute('filter')).toBe('url(#raster-bw)')
})

test('style.bwImage false: image has no bw filter', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.slots.find(s => s.id === 'image')!.content = 'data:image/png;base64,xx'
  d.style.bwImage = false
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector('image')!
  expect(img.getAttribute('filter')).toBeNull()
})

test('style.filmGrain: data-grain rect exists', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.filmGrain = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  expect(container.querySelector('[data-grain]')).toBeTruthy()
})

test('style.filmGrain false: no data-grain rect', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.filmGrain = false
  const { container } = render(<Renderer design={d} measure={measure} />)
  expect(container.querySelector('[data-grain]')).toBeNull()
})

test('style.gridOverlay: data-grid group exists', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.gridOverlay = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  expect(container.querySelector('[data-grid]')).toBeTruthy()
})

test('style.gridOverlay false: no data-grid group', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.gridOverlay = false
  const { container } = render(<Renderer design={d} measure={measure} />)
  expect(container.querySelector('[data-grid]')).toBeNull()
})

test('style.accentHeadline: title-class text slot uses palette.accent as fill', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = true
  // mega-word has a 'word' slot with role 'headline' → typeClass 'title'
  const wordSlot = d.slots.find(s => s.id === 'word')!
  expect(wordSlot.typeClass).toBe('title')
  const { container } = render(<Renderer design={d} measure={measure} />)
  // The title-class text element should have fill = palette.accent
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe(d.palette.accent)
})

test('style.accentHeadline false: title-class text slot uses palette.text', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = false
  const wordSlot = d.slots.find(s => s.id === 'word')!
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe(d.palette.text)
})

test('typography is applied: title class uses typography.title as font-size', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.typography.title = 200
  const wordSlot = d.slots.find(s => s.id === 'word')!
  expect(wordSlot.typeClass).toBe('title')
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  // fit:'fixed' pins at resolvedText.size which is typography.title = 200
  expect(textEl.getAttribute('font-size')).toBe('200')
})

test('slot.color overrides palette.text for text slot fill', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = false
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.color = '#ff0000'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe('#ff0000')
})

test('slot.color overrides palette.accent for title slot when accentHeadline=true', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.accentHeadline = true
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.color = '#00ff00'
  const { container } = render(<Renderer design={d} measure={measure} />)
  const textEl = container.querySelector(`[data-slot="${wordSlot.id}"] text`)!
  expect(textEl.getAttribute('fill')).toBe('#00ff00')
})

test('slot.bw=false overrides global bwImage=true: image has no bw filter', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.bwImage = true
  const imgSlot = d.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.bw = false
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector(`[data-slot="${imgSlot.id}"] image`)!
  expect(img.getAttribute('filter')).toBeNull()
})

test('slot.bw=true overrides global bwImage=false: image gets bw filter', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  d.style.bwImage = false
  const imgSlot = d.slots.find(s => s.role === 'image')!
  imgSlot.content = 'data:image/png;base64,xx'
  imgSlot.bw = true
  const { container } = render(<Renderer design={d} measure={measure} />)
  const img = container.querySelector(`[data-slot="${imgSlot.id}"] image`)!
  expect(img.getAttribute('filter')).toBe('url(#raster-bw)')
})

test('slot with opacity:0.5 renders <g data-slot> with opacity attribute', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const wordSlot = d.slots.find(s => s.id === 'word')!
  wordSlot.opacity = 0.5
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${wordSlot.id}"]`) as SVGElement
  expect(group).toBeTruthy()
  expect(group.getAttribute('opacity')).toBe('0.5')
})

test('slot with no opacity renders <g data-slot> with opacity 1 (default)', () => {
  const d = buildDesign('mega-word', '1:1', 0)
  const wordSlot = d.slots.find(s => s.id === 'word')!
  delete wordSlot.opacity
  const { container } = render(<Renderer design={d} measure={measure} />)
  const group = container.querySelector(`[data-slot="${wordSlot.id}"]`) as SVGElement
  expect(group).toBeTruthy()
  // Either no attribute or "1" — both are equivalent
  const opacityAttr = group.getAttribute('opacity')
  expect(opacityAttr === null || opacityAttr === '1').toBe(true)
})

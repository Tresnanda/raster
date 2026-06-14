import { expect, test } from 'vitest'
import { playPosterMotion, MOTION_EFFECTS } from './motion'

test('playPosterMotion returns null when there is no svg', () => {
  expect(playPosterMotion(null, 'rise')).toBeNull()
})

test('returns null when the svg has no slot groups', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  expect(playPosterMotion(svg, 'rise')).toBeNull()
})

test('builds a timeline when slot groups exist', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  g.setAttribute('data-slot', 'headline')
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  t.textContent = 'HELLO'
  g.appendChild(t)
  svg.appendChild(g)
  const tl = playPosterMotion(svg, 'rise', { paused: true })
  expect(tl).not.toBeNull()
  expect(typeof tl!.play).toBe('function')
})

test('exposes the five motion presets', () => {
  expect(MOTION_EFFECTS.map(e => e.value)).toEqual(['rise', 'wipe', 'scale', 'stagger', 'roll'])
})

import { expect, test } from 'vitest'
import { serializeSvg } from './to-svg'

test('serializes an SVG element to a string with xmlns', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  const out = serializeSvg(svg, '')
  expect(out).toContain('<svg')
  expect(out).toContain('viewBox="0 0 100 100"')
})

test('injects a <style> with provided @font-face css into <defs>', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const out = serializeSvg(svg, "@font-face{font-family:'X';src:url(data:font/woff2;base64,AAA)}")
  expect(out).toContain('<defs>')
  expect(out).toContain('@font-face')
  expect(out).toContain('base64,AAA')
})

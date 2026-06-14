import { expect, test } from 'vitest'
import { generate } from './generate'
import { reshuffleContent, reshuffleSystem } from './reshuffle'
import type { Design } from '../types'

function contentFingerprint(design: Design): string[] {
  return design.slots.filter(slot => slot.text).map(slot => slot.content).sort()
}

function layoutFingerprint(design: Design): string {
  return JSON.stringify(design.slots.map(slot => ({
    role: slot.role,
    cell: slot.cell,
    text: slot.text,
    typeClass: slot.typeClass,
  })))
}

function visualSystemFingerprint(design: Design): string {
  return JSON.stringify({
    palette: design.palette,
    typography: design.typography,
    style: design.style,
    slots: design.slots.map(slot => ({
      id: slot.id,
      role: slot.role,
      cell: slot.cell,
      text: slot.text,
      typeClass: slot.typeClass,
    })),
  })
}

test('reshuffleContent keeps the visual system byte-identical and changes copy', () => {
  const design = generate('4:5', { seed: 15000, candidateCount: 18 })
  const next = reshuffleContent(design, 99)

  expect(visualSystemFingerprint(next)).toBe(visualSystemFingerprint(design))
  expect(next.slots.some((slot, index) => slot.content !== design.slots[index].content)).toBe(true)
})

test('reshuffleContent is deterministic for the same seed', () => {
  const design = generate('3:4', { seed: 15001, candidateCount: 18 })

  expect(reshuffleContent(design, 77)).toEqual(reshuffleContent(design, 77))
})

test('reshuffleSystem keeps current text content while changing the layout system', () => {
  const design = generate('4:5', { seed: 15002, candidateCount: 18 })
  const next = reshuffleSystem(design, 101)

  for (const content of contentFingerprint(design)) {
    expect(contentFingerprint(next)).toContain(content)
  }
  expect(layoutFingerprint(next)).not.toBe(layoutFingerprint(design))
})

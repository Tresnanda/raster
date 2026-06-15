import { expect, test } from 'vitest'
import { buildDesign } from './build'
import { applyTypeSystem, TYPE_SYSTEMS } from './type-systems'
import '../archetypes/index'

test('applyTypeSystem updates global typography and non-overridden text slots', () => {
  const system = TYPE_SYSTEMS.find(item => item.id === 'mono-technical')!
  const design = buildDesign('mega-word', '4:5', 0)
  const withOverride = {
    ...design,
    slots: design.slots.map(slot =>
      slot.id === 'word' && slot.text
        ? {
            ...slot,
            overridden: ['size', 'family'],
            text: { ...slot.text, size: 111, family: 'mono' as const },
          }
        : slot,
    ),
  }

  const applied = applyTypeSystem(withOverride, system.id)
  const title = applied.slots.find(slot => slot.id === 'word')!
  const body = applied.slots.find(slot => slot.id === 'subhead')!

  expect(applied.typography).toEqual({
    typeface: system.typeface,
    title: system.title,
    headline: system.headline,
    body: system.body,
    tracking: system.tracking,
    leading: system.leading,
  })
  expect(title.text!.size).toBe(111)
  expect(title.text!.family).toBe('mono')
  expect(title.overridden).toEqual(['size', 'family'])
  expect(body.text!.size).toBe(system.body)
  expect(body.text!.family).toBe(system.typeface)
})

test('switching type systems is deterministic and reversible for typography', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const first = TYPE_SYSTEMS[0]
  const second = TYPE_SYSTEMS[1]

  const firstPass = applyTypeSystem(design, first.id)
  const secondPass = applyTypeSystem(firstPass, second.id)
  const backToFirst = applyTypeSystem(secondPass, first.id)

  expect(secondPass.typography.typeface).toBe(second.typeface)
  expect(backToFirst.typography).toEqual(firstPass.typography)
})

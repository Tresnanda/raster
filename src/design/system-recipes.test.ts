import { expect, test } from 'vitest'
import { buildDesign } from './build'
import { applySystemRecipe, createSystemRecipe } from './system-recipes'
import '../archetypes/index'

test('createSystemRecipe captures visual system without sharing object references', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const recipe = createSystemRecipe(design, {
    id: 'recipe-1',
    name: 'Black Sprint',
    now: '2026-06-14T08:00:00.000Z',
  })

  expect(recipe.name).toBe('Black Sprint')
  expect(recipe.palette).toEqual(design.palette)
  expect(recipe.typography).toEqual(design.typography)
  expect(recipe.slots).toHaveLength(design.slots.length)
  expect(recipe.slots[0]).not.toBe(design.slots[0])
  expect(recipe.createdAt).toBe('2026-06-14T08:00:00.000Z')
})

test('applySystemRecipe applies layout/style while preserving current text content', () => {
  const source = buildDesign('mega-word', '4:5', 0)
  const target = buildDesign('headline-list', '1:1', 0)
  const targetText = target.slots.filter(s => s.text).map(s => s.content)
  const recipe = createSystemRecipe(source, {
    id: 'recipe-1',
    name: 'Black Sprint',
    now: '2026-06-14T08:00:00.000Z',
  })

  const applied = applySystemRecipe(target, recipe)
  expect(applied.format).toBe(source.format)
  expect(applied.grid).toEqual(source.grid)
  expect(applied.palette).toEqual(source.palette)
  expect(applied.typography).toEqual(source.typography)
  expect(applied.slots.filter(s => s.text).map(s => s.content).slice(0, targetText.length)).toEqual(targetText)
})

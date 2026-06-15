import type { Design, Grid, Palette, Slot, StyleOptions, Typography } from '../types'

export const SYSTEM_RECIPES_KEY = 'raster:system-recipes'

export interface SystemRecipe {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  format: Design['format']
  grid: Grid
  layout: number
  mode: Design['mode']
  palette: Palette
  typography: Typography
  style: StyleOptions
  slots: Slot[]
}

export interface CreateSystemRecipeOptions {
  id?: string
  name?: string
  now?: string
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createId(): string {
  return `recipe-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function sanitizeName(name?: string): string {
  const cleaned = (name ?? '').trim().replace(/\s+/g, ' ')
  return cleaned || 'Untitled System'
}

function stripContent(slot: Slot): Slot {
  const copy = clone(slot)
  return {
    ...copy,
    content: '',
    imageFill: undefined,
    imageSrcOriginal: undefined,
  }
}

export function createSystemRecipe(design: Design, opts: CreateSystemRecipeOptions = {}): SystemRecipe {
  const now = opts.now ?? new Date().toISOString()
  return {
    id: opts.id ?? createId(),
    name: sanitizeName(opts.name),
    createdAt: now,
    updatedAt: now,
    format: design.format,
    grid: clone(design.grid),
    layout: design.layout,
    mode: design.mode,
    palette: clone(design.palette),
    typography: clone(design.typography),
    style: clone(design.style),
    slots: design.slots.map(stripContent),
  }
}

export function applySystemRecipe(target: Design, recipe: SystemRecipe): Design {
  const textContents = target.slots.filter(slot => slot.text).map(slot => slot.content)
  const imageContents = target.slots.filter(slot => slot.role === 'image').map(slot => ({
    content: slot.content,
    imageSrcOriginal: slot.imageSrcOriginal,
    imageEffect: slot.imageEffect,
  }))

  let textIndex = 0
  let imageIndex = 0

  const slots = recipe.slots.map(slot => {
    const next = clone(slot)
    if (next.text) {
      next.content = textContents[textIndex] ?? next.content
      textIndex += 1
    } else if (next.role === 'image') {
      const image = imageContents[imageIndex]
      next.content = image?.content ?? next.content
      next.imageSrcOriginal = image?.imageSrcOriginal ?? image?.content
      next.imageEffect = image?.imageEffect
      imageIndex += 1
    }
    return next
  })

  return {
    ...target,
    format: recipe.format,
    grid: clone(recipe.grid),
    layout: recipe.layout,
    mode: recipe.mode,
    palette: clone(recipe.palette),
    typography: clone(recipe.typography),
    style: clone(recipe.style),
    slots,
  }
}

export function deleteSystemRecipe(recipes: SystemRecipe[], id: string): SystemRecipe[] {
  return recipes.filter(recipe => recipe.id !== id)
}

export function readSystemRecipes(): SystemRecipe[] {
  try {
    const raw = localStorage.getItem(SYSTEM_RECIPES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as SystemRecipe[] : []
  } catch {
    return []
  }
}

export function writeSystemRecipes(recipes: SystemRecipe[]): void {
  try {
    localStorage.setItem(SYSTEM_RECIPES_KEY, JSON.stringify(recipes))
  } catch {
    // Keep in-memory state usable even when persistence is unavailable.
  }
}

import type { Design, Slot } from '../types'
import { dominantTextSlot } from './series'

export const POSTER_MINE_KEY = 'raster:poster-mine'

export type PosterMineSource =
  | 'manual'
  | 'shuffle'
  | 'surprise'
  | 'riff'
  | 'daily'
  | 'campaign'
  | 'recipe'

export interface SavedPoster {
  id: string
  title: string
  source: PosterMineSource
  createdAt: string
  updatedAt: string
  favorite: boolean
  tags: string[]
  design: Design
  parentId?: string
}

export interface CreateSavedPosterOptions {
  id?: string
  source: PosterMineSource
  parentId?: string
  now?: string
  title?: string
  tags?: string[]
}

function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design
}

function createId(): string {
  return `poster-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function cleanTitle(value: string): string {
  return value
    .split(/\n+/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
}

function readableTextSlots(design: Design): Slot[] {
  return design.slots.filter(slot => !!slot.text && cleanTitle(slot.content).length > 0)
}

export function derivePosterTitle(design: Design): string {
  const dominant = dominantTextSlot(design)
  const fromDominant = dominant ? cleanTitle(dominant.content) : ''
  if (fromDominant) return fromDominant
  const first = readableTextSlots(design)[0]
  const fromFirst = first ? cleanTitle(first.content) : ''
  return fromFirst || `Raster ${design.layout || 'generated'}`
}

export function normalizePosterTags(tags: string[]): string[] {
  return [...new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8)
}

export function createSavedPoster(design: Design, opts: CreateSavedPosterOptions): SavedPoster {
  const now = opts.now ?? new Date().toISOString()
  const title = cleanTitle(opts.title ?? '') || derivePosterTitle(design)
  return {
    id: opts.id ?? createId(),
    title,
    source: opts.source,
    parentId: opts.parentId,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    tags: normalizePosterTags(opts.tags ?? []),
    design: cloneDesign(design),
  }
}

export function toggleSavedPosterFavorite(posters: SavedPoster[], id: string, now = new Date().toISOString()): SavedPoster[] {
  return posters.map(poster =>
    poster.id === id
      ? { ...poster, favorite: !poster.favorite, updatedAt: now }
      : poster,
  )
}

export function updateSavedPosterTags(posters: SavedPoster[], id: string, tags: string[], now = new Date().toISOString()): SavedPoster[] {
  const normalized = normalizePosterTags(tags)
  return posters.map(poster =>
    poster.id === id
      ? { ...poster, tags: normalized, updatedAt: now }
      : poster,
  )
}

export function deleteSavedPoster(posters: SavedPoster[], id: string): SavedPoster[] {
  return posters.filter(poster => poster.id !== id)
}

export function readSavedPosters(): SavedPoster[] {
  try {
    const raw = localStorage.getItem(POSTER_MINE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as SavedPoster[] : []
  } catch {
    return []
  }
}

export function writeSavedPosters(posters: SavedPoster[]): void {
  try {
    localStorage.setItem(POSTER_MINE_KEY, JSON.stringify(posters))
  } catch {
    // Ignore quota/private-mode failures; the in-memory store still works.
  }
}

import { beforeEach, expect, test } from 'vitest'
import { buildDesign } from './build'
import {
  createSavedPoster,
  deleteSavedPoster,
  derivePosterTitle,
  readSavedPosters,
  toggleSavedPosterFavorite,
  updateSavedPosterTags,
  writeSavedPosters,
} from './poster-mine'
import '../archetypes/index'

beforeEach(() => {
  localStorage.clear()
})

test('derivePosterTitle uses the dominant readable text', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  expect(derivePosterTitle(design)).toBe('ATL3')
})

test('createSavedPoster snapshots design metadata for the mine', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const saved = createSavedPoster(design, {
    id: 'poster-1',
    source: 'riff',
    parentId: 'root-1',
    now: '2026-06-14T08:00:00.000Z',
  })

  expect(saved).toMatchObject({
    id: 'poster-1',
    title: 'ATL3',
    source: 'riff',
    parentId: 'root-1',
    favorite: false,
    tags: [],
    createdAt: '2026-06-14T08:00:00.000Z',
    updatedAt: '2026-06-14T08:00:00.000Z',
  })
  expect(saved.design).not.toBe(design)
  expect(saved.design.slots[1].content).toBe('ATL3')
})

test('toggleSavedPosterFavorite updates only the requested poster', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const posters = [
    createSavedPoster(design, { id: 'a', source: 'manual', now: '2026-06-14T08:00:00.000Z' }),
    createSavedPoster(design, { id: 'b', source: 'manual', now: '2026-06-14T08:00:00.000Z' }),
  ]

  const next = toggleSavedPosterFavorite(posters, 'b', '2026-06-14T09:00:00.000Z')
  expect(next.find(p => p.id === 'a')!.favorite).toBe(false)
  expect(next.find(p => p.id === 'b')!.favorite).toBe(true)
  expect(next.find(p => p.id === 'b')!.updatedAt).toBe('2026-06-14T09:00:00.000Z')
})

test('updateSavedPosterTags trims, dedupes, and lowercases tags', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const poster = createSavedPoster(design, { id: 'a', source: 'manual', now: '2026-06-14T08:00:00.000Z' })
  const next = updateSavedPosterTags([poster], 'a', ['  Swiss ', 'SWISS', '', 'poster'], '2026-06-14T09:00:00.000Z')

  expect(next[0].tags).toEqual(['swiss', 'poster'])
  expect(next[0].updatedAt).toBe('2026-06-14T09:00:00.000Z')
})

test('deleteSavedPoster removes a poster from the mine', () => {
  const design = buildDesign('mega-word', '4:5', 0)
  const posters = [
    createSavedPoster(design, { id: 'a', source: 'manual', now: '2026-06-14T08:00:00.000Z' }),
    createSavedPoster(design, { id: 'b', source: 'manual', now: '2026-06-14T08:00:00.000Z' }),
  ]

  expect(deleteSavedPoster(posters, 'a').map(p => p.id)).toEqual(['b'])
})

test('createSavedPoster strips heavy image bytes from the persisted design only', () => {
  const dataUrl = `data:image/png;base64,${'a'.repeat(12_000)}`
  const design = {
    ...buildDesign('mega-word', '4:5', 0),
    slots: [
      ...buildDesign('mega-word', '4:5', 0).slots,
      {
        id: 'photo',
        role: 'image' as const,
        cell: { c: 0, cs: 12, r: 0, rs: 8 },
        content: dataUrl,
        imageSrcOriginal: dataUrl,
        z: 40,
      },
    ],
  }

  const saved = createSavedPoster(design, {
    id: 'poster-with-image',
    source: 'manual',
    now: '2026-06-14T08:00:00.000Z',
  })
  const savedImage = saved.design.slots.find(slot => slot.id === 'photo')!
  const originalImage = design.slots.find(slot => slot.id === 'photo')!

  expect(savedImage.content).toBe('')
  expect(savedImage.imageSrcOriginal).toBeUndefined()
  expect(originalImage.content).toBe(dataUrl)
  expect(originalImage.imageSrcOriginal).toBe(dataUrl)
})

test('writeSavedPosters returns success and round-trips a lightweight image poster', () => {
  const dataUrl = `data:image/png;base64,${'b'.repeat(12_000)}`
  const design = {
    ...buildDesign('mega-word', '4:5', 0),
    slots: [
      ...buildDesign('mega-word', '4:5', 0).slots,
      {
        id: 'photo',
        role: 'image' as const,
        cell: { c: 0, cs: 12, r: 0, rs: 8 },
        content: dataUrl,
        imageSrcOriginal: dataUrl,
        z: 40,
      },
    ],
  }
  const saved = createSavedPoster(design, {
    id: 'poster-with-image',
    source: 'manual',
    now: '2026-06-14T08:00:00.000Z',
  })

  expect(writeSavedPosters([saved])).toBe(true)
  expect(localStorage.getItem('raster:poster-mine')).not.toContain(dataUrl.slice(0, 256))
  expect(readSavedPosters()[0].design.slots.find(slot => slot.id === 'photo')!.content).toBe('')
})

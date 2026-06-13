import { create } from 'zustand'
import type { Box, Design, Format, Palette, StyleOptions, TextStyle, Typography } from '../types'
import { buildDesign } from '../design/build'
import { reShuffle, surprise as doSurprise, mergeContent } from '../design/shuffle'
import { buildFromLayout } from '../design/layouts'
import { DEFAULT_TYPOGRAPHY, DEFAULT_STYLE, classOf } from '../design/typeclass'

const KEY = 'raster:design'

function persist(d: Design) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* quota / private mode */ }
}

function load(): Design | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Design> & Pick<Design, 'format' | 'grid' | 'archetype' | 'palette' | 'seed' | 'mode' | 'slots'>
    // Migrate old saves that lack typography / style / layout / typeClass
    const migrated: Design = {
      ...parsed,
      typography: { ...DEFAULT_TYPOGRAPHY, ...(parsed.typography ?? {}) },
      style: { ...DEFAULT_STYLE, ...(parsed.style ?? {}) },
      layout: parsed.layout ?? 1,
      slots: (parsed.slots ?? []).map(s => ({
        ...s,
        typeClass: s.typeClass ?? (s.role !== 'image' && s.role !== 'block' ? classOf(s.role) : undefined),
      })),
    }
    return migrated
  } catch {
    return null
  }
}

interface State {
  design: Design
  reset: (archetypeId: string, format: Format) => void
  setContent: (slotId: string, content: string) => void
  setFormat: (format: Format) => void
  setPalette: (p: Palette) => void
  setMode: (mode: 'grid' | 'free') => void
  setText: (slotId: string, patch: Partial<TextStyle>) => void
  setBox: (slotId: string, box: Box) => void
  shuffle: () => void
  setTypography: (patch: Partial<Typography>) => void
  setStyle: (patch: Partial<StyleOptions>) => void
  setAccent: (hex: string) => void
  setLayout: (n: number) => void
  nextLayout: () => void
  prevLayout: () => void
  surprise: () => void
}

import '../archetypes/index'

const initial = load() ?? buildDesign('mega-word', '4:5', 0)

export const useDesign = create<State>((set, get) => ({
  design: initial,

  reset: (archetypeId, format) => {
    const d = buildDesign(archetypeId, format, 0)
    persist(d); set({ design: d })
  },

  setContent: (slotId, content) => {
    const d = { ...get().design, slots: get().design.slots.map(s => s.id === slotId ? { ...s, content } : s) }
    persist(d); set({ design: d })
  },

  setFormat: (format) => {
    const d = { ...get().design, format }
    persist(d); set({ design: d })
  },

  setPalette: (palette) => {
    const d = { ...get().design, palette }
    persist(d); set({ design: d })
  },

  setMode: (mode) => {
    const d = { ...get().design, mode }
    persist(d); set({ design: d })
  },

  setText: (slotId, patch) => {
    const d = { ...get().design, slots: get().design.slots.map(s =>
      s.id === slotId && s.text ? { ...s, text: { ...s.text, ...patch } } : s) }
    persist(d); set({ design: d })
  },

  setBox: (slotId, box) => {
    const d = { ...get().design, slots: get().design.slots.map(s => s.id === slotId ? { ...s, box } : s) }
    persist(d); set({ design: d })
  },

  shuffle: () => {
    const d = reShuffle(get().design)
    persist(d); set({ design: d })
  },

  setTypography: (patch) => {
    const d = { ...get().design, typography: { ...get().design.typography, ...patch } }
    persist(d); set({ design: d })
  },

  setStyle: (patch) => {
    const d = { ...get().design, style: { ...get().design.style, ...patch } }
    persist(d); set({ design: d })
  },

  setAccent: (hex) => {
    const d = { ...get().design, palette: { ...get().design.palette, accent: hex } }
    persist(d); set({ design: d })
  },

  setLayout: (n) => {
    const current = get().design
    const newDesign = buildFromLayout(n, current.format)
    // Preserve content for matching slot ids, keep current typography/style/palette
    const withContent = mergeContent(newDesign, current)
    const d = {
      ...withContent,
      typography: { ...current.typography },
      style: { ...current.style },
      palette: { ...current.palette },
    }
    persist(d); set({ design: d })
  },

  nextLayout: () => {
    const current = get().design
    const n = (current.layout % 19) + 1
    get().setLayout(n)
  },

  prevLayout: () => {
    const current = get().design
    const n = current.layout <= 1 ? 19 : current.layout - 1
    get().setLayout(n)
  },

  surprise: () => {
    const d = doSurprise(get().design)
    persist(d); set({ design: d })
  },
}))

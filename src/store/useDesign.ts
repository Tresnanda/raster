import { create } from 'zustand'
import type { Design, Format, Palette } from '../types'
import { buildDesign } from '../design/build'
import { reShuffle } from '../design/shuffle'

const KEY = 'raster:design'

function persist(d: Design) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* quota / private mode */ }
}
function load(): Design | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as Design : null } catch { return null }
}

interface State {
  design: Design
  reset: (archetypeId: string, format: Format) => void
  setContent: (slotId: string, content: string) => void
  setFormat: (format: Format) => void
  setPalette: (p: Palette) => void
  setMode: (mode: 'grid' | 'free') => void
  shuffle: () => void
}

import '../archetypes/index'

const initial = load() ?? buildDesign('mega-word', '4:5', 0)

export const useDesign = create<State>((set, get) => ({
  design: initial,
  reset: (archetypeId, format) => { const d = buildDesign(archetypeId, format, 0); persist(d); set({ design: d }) },
  setContent: (slotId, content) => {
    const d = { ...get().design, slots: get().design.slots.map(s => s.id === slotId ? { ...s, content } : s) }
    persist(d); set({ design: d })
  },
  setFormat: (format) => { const d = { ...get().design, format }; persist(d); set({ design: d }) },
  setPalette: (palette) => { const d = { ...get().design, palette }; persist(d); set({ design: d }) },
  setMode: (mode) => { const d = { ...get().design, mode }; persist(d); set({ design: d }) },
  shuffle: () => { const d = reShuffle(get().design); persist(d); set({ design: d }) },
}))

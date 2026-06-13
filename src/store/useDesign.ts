import { create } from 'zustand'
import type { Box, Design, Format, Palette, Slot, StyleOptions, TextStyle, Typography } from '../types'
import { buildDesign } from '../design/build'
import { reShuffle, mergeContent } from '../design/shuffle'
import { buildFromLayout } from '../design/layouts'
import { DEFAULT_TYPOGRAPHY, DEFAULT_STYLE, classOf } from '../design/typeclass'
import { canvasFor } from '../design/formats'
import { generate } from '../design/generate'

const KEY = 'raster:design'

function persist(d: Design) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* quota / private mode */ }
}

function load(): Design | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Design> & Pick<Design, 'format' | 'grid' | 'archetype' | 'palette' | 'seed' | 'mode' | 'slots'>
    // Migrate old saves that lack typography / style / layout / typeClass / z
    const migrated: Design = {
      ...parsed,
      typography: { ...DEFAULT_TYPOGRAPHY, ...(parsed.typography ?? {}) },
      style: { ...DEFAULT_STYLE, ...(parsed.style ?? {}) },
      layout: parsed.layout ?? 1,
      slots: (parsed.slots ?? []).map((s, i) => ({
        ...s,
        typeClass: s.typeClass ?? (s.role !== 'image' && s.role !== 'block' && s.role !== 'line' ? classOf(s.role) : undefined),
        // Ensure every slot has a z (fallback to array index)
        z: s.z ?? i,
      })),
    }
    return migrated
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the current max z across all slots. */
function maxZOf(slots: Slot[]): number {
  if (slots.length === 0) return -1
  return slots.reduce((m, s, i) => Math.max(m, s.z ?? i), -1)
}

/** Counter for unique element ids within this session. */
let _elCounter = 0
function nextElId(): string {
  return `el-${Date.now()}-${++_elCounter}`
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface State {
  design: Design
  selectedId: string | null

  reset: (archetypeId: string, format: Format) => void
  setContent: (slotId: string, content: string) => void
  setFormat: (format: Format) => void
  setPalette: (p: Palette) => void
  setMode: (mode: 'grid' | 'free') => void
  setText: (slotId: string, patch: Partial<TextStyle>) => void
  setBox: (slotId: string, box: Box) => void
  shuffle: () => void
  pickForMe: () => void
  setTypography: (patch: Partial<Typography>) => void
  setStyle: (patch: Partial<StyleOptions>) => void
  setAccent: (hex: string) => void
  setLayout: (n: number) => void
  nextLayout: () => void
  prevLayout: () => void
  surprise: () => void

  // Element CRUD
  selectElement: (id: string | null) => void
  addElement: (type: 'text' | 'image' | 'block' | 'line') => void
  deleteElement: (id: string) => void
  duplicateElement: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
}

import '../archetypes/index'

const initial = load() ?? buildDesign('mega-word', '4:5', 0)

export const useDesign = create<State>((set, get) => ({
  design: initial,
  selectedId: null,

  reset: (archetypeId, format) => {
    const d = buildDesign(archetypeId, format, 0)
    persist(d); set({ design: d, selectedId: null })
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

  pickForMe: () => {
    // Pick a random layout from 1..19
    const n = Math.floor(Math.random() * 19) + 1
    get().setLayout(n)
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
    const current = get().design
    const d = generate(current.format)
    persist(d); set({ design: d, selectedId: null })
  },

  // ---------------------------------------------------------------------------
  // Element CRUD
  // ---------------------------------------------------------------------------

  selectElement: (id) => {
    set({ selectedId: id })
  },

  addElement: (type) => {
    const design = get().design
    const canvas = canvasFor(design.format)
    const newZ = maxZOf(design.slots) + 1
    const elId = nextElId()

    // Centered ~40% width default box in canvas units
    const w = Math.round(canvas.w * 0.4)
    const h = type === 'line' ? 4 : Math.round(canvas.h * 0.15)
    const x = Math.round((canvas.w - w) / 2)
    const y = Math.round((canvas.h - h) / 2)
    const box: Box = { x, y, w, h }

    // Dummy cell (required by type; box overrides it)
    const cell = { c: 0, cs: 12, r: 0, rs: 1 }

    let slot: Slot

    switch (type) {
      case 'text':
        slot = {
          id: elId, role: 'caption', z: newZ,
          cell, box,
          content: 'Text',
          text: { family: 'sans', weight: 600, size: 64, tracking: 0, leading: 1.05, align: 'left', fit: 'fixed' },
          typeClass: 'body',
        }
        break

      case 'image':
        slot = {
          id: elId, role: 'image', z: newZ,
          cell, box,
          content: '',
        }
        break

      case 'block':
        slot = {
          id: elId, role: 'block', z: newZ,
          cell, box,
          content: '',
          fill: 'accent',
        }
        break

      case 'line':
        slot = {
          id: elId, role: 'line', z: newZ,
          cell, box,
          content: '',
          fill: 'accent',
        }
        break
    }

    const d = { ...design, slots: [...design.slots, slot] }
    persist(d); set({ design: d, selectedId: elId })
  },

  deleteElement: (id) => {
    const design = get().design
    const d = { ...design, slots: design.slots.filter(s => s.id !== id) }
    const sel = get().selectedId === id ? null : get().selectedId
    persist(d); set({ design: d, selectedId: sel })
  },

  duplicateElement: (id) => {
    const design = get().design
    const src = design.slots.find(s => s.id === id)
    if (!src) return

    const canvas = canvasFor(design.format)
    const grid = design.grid

    // Resolve current box geometry
    let srcBox: Box
    if (src.box) {
      srcBox = src.box
    } else {
      // Resolve from grid cell
      const { cols, rows, margin, gutter } = grid
      const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
      const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows
      srcBox = {
        x: margin + src.cell.c * (colW + gutter),
        y: margin + src.cell.r * (rowH + gutter),
        w: src.cell.cs * colW + (src.cell.cs - 1) * gutter,
        h: src.cell.rs * rowH + (src.cell.rs - 1) * gutter,
      }
    }

    const newZ = maxZOf(design.slots) + 1
    const newId = nextElId()
    const copy: Slot = {
      ...src,
      id: newId,
      z: newZ,
      box: { ...srcBox, x: srcBox.x + 24, y: srcBox.y + 24 },
    }

    const d = { ...design, slots: [...design.slots, copy] }
    persist(d); set({ design: d, selectedId: newId })
  },

  bringForward: (id) => {
    const design = get().design
    const slots = design.slots

    // Ensure all slots have z
    const withZ = slots.map((s, i) => ({ ...s, z: s.z ?? i }))
    // Sort by z to find neighbors
    const sorted = [...withZ].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    const idx = sorted.findIndex(s => s.id === id)
    if (idx === -1 || idx >= sorted.length - 1) {
      // Already at top or not found
      const d = { ...design, slots: withZ }
      persist(d); set({ design: d })
      return
    }

    // Swap z with next higher slot
    const current = sorted[idx]
    const next = sorted[idx + 1]
    const currentZ = current.z!
    const nextZ = next.z!
    const updated = withZ.map(s => {
      if (s.id === current.id) return { ...s, z: nextZ }
      if (s.id === next.id) return { ...s, z: currentZ }
      return s
    })

    const d = { ...design, slots: updated }
    persist(d); set({ design: d })
  },

  sendBackward: (id) => {
    const design = get().design
    const slots = design.slots

    // Ensure all slots have z
    const withZ = slots.map((s, i) => ({ ...s, z: s.z ?? i }))
    const sorted = [...withZ].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    const idx = sorted.findIndex(s => s.id === id)
    if (idx <= 0) {
      // Already at bottom or not found
      const d = { ...design, slots: withZ }
      persist(d); set({ design: d })
      return
    }

    // Swap z with next lower slot
    const current = sorted[idx]
    const prev = sorted[idx - 1]
    const currentZ = current.z!
    const prevZ = prev.z!
    const updated = withZ.map(s => {
      if (s.id === current.id) return { ...s, z: prevZ }
      if (s.id === prev.id) return { ...s, z: currentZ }
      return s
    })

    const d = { ...design, slots: updated }
    persist(d); set({ design: d })
  },
}))

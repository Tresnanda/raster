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
// History coalescing
// ---------------------------------------------------------------------------

/** Module-level last coalesce key — tracks whether consecutive commits share a key. */
let lastCoalesceKey: string | null = null

const HISTORY_CAP = 50

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface State {
  design: Design
  selectedId: string | null

  // History (not persisted)
  past: Design[]
  future: Design[]

  // Clipboard (not persisted)
  clipboard: Slot | null

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

  // Clipboard actions
  copySelected: () => void
  cutSelected: () => void
  paste: () => void

  // Undo / redo
  undo: () => void
  redo: () => void

  snap: boolean
  setSnap: (snap: boolean) => void

  // Crop flow — not persisted
  /** Transient UI state. Non-null while the crop modal is open. */
  cropRequest: { slotId: string; src: string } | null
  requestCrop: (slotId: string, src: string) => void
  cancelCrop: () => void
  setFill: (slotId: string, fill: string) => void

  // Per-element overrides
  overrideText: (slotId: string, patch: Partial<TextStyle>) => void
  setColor: (slotId: string, hex: string) => void
  setBw: (slotId: string, bw: boolean) => void
  resetElement: (slotId: string) => void
}

import '../archetypes/index'

const initial = load() ?? buildDesign('mega-word', '4:5', 0)

export const useDesign = create<State>((set, get) => {
  // -----------------------------------------------------------------------
  // Internal commit helper
  // -----------------------------------------------------------------------
  function commit(next: Design, opts?: { coalesceKey?: string }) {
    const state = get()
    const key = opts?.coalesceKey ?? null

    let newPast: Design[]
    if (key !== null && key === lastCoalesceKey) {
      // Coalesce: same continuous edit — don't grow history
      newPast = state.past
    } else {
      // Push current design onto past, cap at HISTORY_CAP
      newPast = [...state.past, state.design]
      if (newPast.length > HISTORY_CAP) {
        newPast = newPast.slice(newPast.length - HISTORY_CAP)
      }
    }

    lastCoalesceKey = key

    persist(next)
    set({ design: next, past: newPast, future: [] })
  }

  return {
    design: initial,
    selectedId: null,
    cropRequest: null,
    snap: true,
    past: [],
    future: [],
    clipboard: null,

    setSnap: (snap) => {
      set({ snap })
    },

    reset: (archetypeId, format) => {
      const d = buildDesign(archetypeId, format, 0)
      // Reset also clears history and clipboard
      lastCoalesceKey = null
      persist(d)
      set({ design: d, selectedId: null, past: [], future: [], clipboard: null })
    },

    setContent: (slotId, content) => {
      const d = { ...get().design, slots: get().design.slots.map(s => s.id === slotId ? { ...s, content } : s) }
      commit(d, { coalesceKey: `content:${slotId}` })
    },

    setFormat: (format) => {
      const d = { ...get().design, format }
      commit(d)
    },

    setPalette: (palette) => {
      const d = { ...get().design, palette }
      commit(d)
    },

    setMode: (mode) => {
      const d = { ...get().design, mode }
      commit(d)
    },

    setText: (slotId, patch) => {
      const d = { ...get().design, slots: get().design.slots.map(s =>
        s.id === slotId && s.text ? { ...s, text: { ...s.text, ...patch } } : s) }
      commit(d, { coalesceKey: `text:${slotId}` })
    },

    setBox: (slotId, box) => {
      const d = { ...get().design, slots: get().design.slots.map(s => s.id === slotId ? { ...s, box } : s) }
      commit(d, { coalesceKey: `box:${slotId}` })
    },

    shuffle: () => {
      const d = reShuffle(get().design)
      commit(d)
    },

    pickForMe: () => {
      // Pick a random layout from 1..19
      const n = Math.floor(Math.random() * 19) + 1
      get().setLayout(n)
    },

    setTypography: (patch) => {
      const d = { ...get().design, typography: { ...get().design.typography, ...patch } }
      commit(d, { coalesceKey: 'typography' })
    },

    setStyle: (patch) => {
      const d = { ...get().design, style: { ...get().design.style, ...patch } }
      commit(d, { coalesceKey: 'style' })
    },

    setAccent: (hex) => {
      const d = { ...get().design, palette: { ...get().design.palette, accent: hex } }
      commit(d, { coalesceKey: 'accent' })
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
      commit(d)
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
      // surprise is a discrete action — commit then clear selection
      commit(d)
      set({ selectedId: null })
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
      commit(d)
      set({ selectedId: elId })
    },

    deleteElement: (id) => {
      const design = get().design
      const d = { ...design, slots: design.slots.filter(s => s.id !== id) }
      const sel = get().selectedId === id ? null : get().selectedId
      commit(d)
      set({ selectedId: sel })
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
      commit(d)
      set({ selectedId: newId })
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
        commit(d)
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
      commit(d)
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
        commit(d)
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
      commit(d)
    },

    // ---------------------------------------------------------------------------
    // Clipboard
    // ---------------------------------------------------------------------------

    copySelected: () => {
      const { selectedId, design } = get()
      if (!selectedId) return
      const slot = design.slots.find(s => s.id === selectedId)
      if (!slot) return
      // Deep clone — JSON round-trip is safe for plain objects
      const clone: Slot = JSON.parse(JSON.stringify(slot))
      set({ clipboard: clone })
    },

    cutSelected: () => {
      const { selectedId, design } = get()
      if (!selectedId) return
      const slot = design.slots.find(s => s.id === selectedId)
      if (!slot) return
      const clone: Slot = JSON.parse(JSON.stringify(slot))
      set({ clipboard: clone })
      // deleteElement goes through commit (one history step)
      get().deleteElement(selectedId)
    },

    paste: () => {
      const { clipboard, design } = get()
      if (!clipboard) return

      const canvas = canvasFor(design.format)
      const grid = design.grid

      // Resolve a concrete box from the clipboard slot
      let srcBox: Box
      if (clipboard.box) {
        srcBox = { ...clipboard.box }
      } else {
        // Resolve from grid cell
        const { cols, rows, margin, gutter } = grid
        const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
        const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows
        srcBox = {
          x: margin + clipboard.cell.c * (colW + gutter),
          y: margin + clipboard.cell.r * (rowH + gutter),
          w: clipboard.cell.cs * colW + (clipboard.cell.cs - 1) * gutter,
          h: clipboard.cell.rs * rowH + (clipboard.cell.rs - 1) * gutter,
        }
      }

      const newZ = maxZOf(design.slots) + 1
      const newId = nextElId()
      const pasted: Slot = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id: newId,
        z: newZ,
        box: { ...srcBox, x: srcBox.x + 24, y: srcBox.y + 24 },
      }

      const d = { ...design, slots: [...design.slots, pasted] }
      commit(d)
      set({ selectedId: newId })
    },

    // ---------------------------------------------------------------------------
    // Undo / redo
    // ---------------------------------------------------------------------------

    undo: () => {
      const { past, design, future, selectedId } = get()
      if (past.length === 0) return

      const prev = past[past.length - 1]
      const newPast = past.slice(0, past.length - 1)
      const newFuture = [design, ...future]

      lastCoalesceKey = null

      // Clear selection if the restored design no longer contains the selected slot
      const newSelectedId = prev.slots.some(s => s.id === selectedId) ? selectedId : null

      persist(prev)
      set({ design: prev, past: newPast, future: newFuture, selectedId: newSelectedId })
    },

    redo: () => {
      const { past, design, future, selectedId } = get()
      if (future.length === 0) return

      const next = future[0]
      const newFuture = future.slice(1)
      const newPast = [...past, design]

      lastCoalesceKey = null

      const newSelectedId = next.slots.some(s => s.id === selectedId) ? selectedId : null

      persist(next)
      set({ design: next, past: newPast, future: newFuture, selectedId: newSelectedId })
    },

    // ---------------------------------------------------------------------------
    // Crop flow
    // ---------------------------------------------------------------------------

    requestCrop: (slotId, src) => {
      set({ cropRequest: { slotId, src } })
    },

    cancelCrop: () => {
      set({ cropRequest: null })
    },

    setFill: (slotId, fill) => {
      const d = { ...get().design, slots: get().design.slots.map(s =>
        s.id === slotId ? { ...s, fill } : s) }
      commit(d)
    },

    overrideText: (slotId, patch) => {
      const design = get().design
      const newFields = Object.keys(patch) as string[]
      const d = {
        ...design,
        slots: design.slots.map(s => {
          if (s.id !== slotId || !s.text) return s
          const prevOverridden = s.overridden ?? []
          const overridden = [...new Set([...prevOverridden, ...newFields])]
          return { ...s, text: { ...s.text, ...patch }, overridden }
        }),
      }
      commit(d, { coalesceKey: `text:${slotId}` })
    },

    setColor: (slotId, hex) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => s.id === slotId ? { ...s, color: hex } : s),
      }
      commit(d, { coalesceKey: `color:${slotId}` })
    },

    setBw: (slotId, bw) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => s.id === slotId ? { ...s, bw } : s),
      }
      commit(d)
    },

    resetElement: (slotId) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => {
          if (s.id !== slotId) return s
          const { overridden: _o, color: _c, bw: _b, ...rest } = s
          return rest
        }),
      }
      commit(d)
    },
  }
})

import { create } from 'zustand'
import type { Box, Design, Format, ImageEffect, Palette, Shadow, Slot, StyleOptions, TextStyle, Typography } from '../types'
import { buildDesign } from '../design/build'
import { reShuffle, mergeContent } from '../design/shuffle'
import { buildFromLayout } from '../design/layouts'
import { DEFAULT_TYPOGRAPHY, DEFAULT_STYLE, classOf } from '../design/typeclass'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
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
        // Migration: imageSrcOriginal defaults to content for old image slots
        imageSrcOriginal: s.imageSrcOriginal ?? (s.role === 'image' && s.content ? s.content : undefined),
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

/** Counter for riff node ids — simple incrementing, collision-free. */
let _riffNodeCounter = 0
function nextRiffId(): string {
  return `riff-${++_riffNodeCounter}`
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
  /** Multi-selection. `selectedId` mirrors the LAST entry (the primary, shown in
   *  the single-element inspector). Empty array = nothing selected. */
  selectedIds: string[]

  // History (not persisted)
  past: Design[]
  future: Design[]

  // Clipboard (not persisted)
  clipboard: Slot | null

  reset: (archetypeId: string, format: Format) => void
  loadDesign: (design: Design) => void
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

  // Image fill for text slots
  setImageFill: (slotId: string, src: string) => void
  clearImageFill: (slotId: string) => void

  // Per-element overrides
  overrideText: (slotId: string, patch: Partial<TextStyle>) => void
  setColor: (slotId: string, hex: string) => void
  setBw: (slotId: string, bw: boolean) => void
  resetElement: (slotId: string) => void

  // Opacity
  setOpacity: (slotId: string, value: number) => void

  // Alignment
  alignElement: (slotId: string, edge: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
  toggleSelection: (id: string) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void
  setBoxes: (updates: { id: string; box: Box }[]) => void
  alignSelection: (edge: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
  distributeSelection: (axis: 'h' | 'v') => void

  // Generic patch helper
  updateSlot: (id: string, patch: Partial<Slot>, coalesceKey?: string) => void
  toggleHidden: (id: string) => void
  toggleLocked: (id: string) => void
  renameSlot: (id: string, name: string) => void

  // Transform helpers
  setRotation: (id: string, deg: number) => void
  setFlip: (id: string, axis: 'H' | 'V', on: boolean) => void
  setRadius: (id: string, px: number) => void
  setStroke: (id: string, hexOrToken: string) => void
  setStrokeWidth: (id: string, px: number) => void
  setShadow: (id: string, shadow: Shadow | null) => void
  setBlend: (id: string, mode: string) => void

  // Image effects
  placeImage: (slotId: string, src: string) => void
  setImageEffect: (slotId: string, effect: ImageEffect) => void
  setProcessedImage: (slotId: string, dataUrl: string) => void

  // Type pack
  setTextTransform: (id: string, v: Slot['textTransform']) => void
  setIndent: (id: string, px: number) => void
  setListStyle: (id: string, v: Slot['listStyle']) => void

  // -------------------------------------------------------------------------
  // Viewport state (zoom / pan) — not in undo history
  // -------------------------------------------------------------------------

  zoom: number
  pan: { x: number; y: number }
  setZoom: (z: number) => void
  setPan: (p: { x: number; y: number }) => void
  zoomBy: (factor: number) => void
  zoomToFit: () => void
  zoomTo100: () => void

  // -------------------------------------------------------------------------
  // Riff / variation explorer
  // -------------------------------------------------------------------------

  /** Whether the Riff modal is open. */
  riffOpen: boolean
  openRiff: () => void
  closeRiff: () => void
  commandOpen: boolean
  setCommandOpen: (v: boolean) => void
  motionEffect: import('../design/motion').MotionEffect
  setMotionEffect: (e: import('../design/motion').MotionEffect) => void

  /** Mutation strength 0..1. Default 0.5. */
  riffStrength: number
  setRiffStrength: (n: number) => void

  /** In-memory lineage tree. */
  riffTree: {
    nodes: Record<string, RiffNode>
    rootId: string | null
    currentId: string | null
  }

  /** Seed the tree from the current design (creates root, sets current). */
  seedRiff: () => void

  /** Apply a mutated variant as the working design and add a child tree node. */
  applyRiff: (design: Design) => void

  /** Jump to an earlier tree node and branch from there. */
  gotoRiffNode: (id: string) => void
}

export interface RiffNode {
  id: string
  parentId: string | null
  design: Design
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
    selectedIds: [],
    cropRequest: null,
    snap: true,
    past: [],
    future: [],
    clipboard: null,
    commandOpen: false,
    motionEffect: 'rise',
    zoom: 1,
    pan: { x: 0, y: 0 },
    riffOpen: false,
    riffStrength: 0.5,
    riffTree: { nodes: {}, rootId: null, currentId: null },

    setSnap: (snap) => {
      set({ snap })
    },

    setZoom: (z) => {
      const clamped = Math.min(8, Math.max(0.1, z))
      set({ zoom: clamped })
    },

    setPan: (p) => {
      set({ pan: p })
    },

    zoomBy: (factor) => {
      const { zoom } = get()
      const clamped = Math.min(8, Math.max(0.1, zoom * factor))
      set({ zoom: clamped })
    },

    zoomToFit: () => {
      set({ zoom: 1, pan: { x: 0, y: 0 } })
    },

    zoomTo100: () => {
      set({ zoom: 1 })
    },

    reset: (archetypeId, format) => {
      const d = buildDesign(archetypeId, format, 0)
      // Reset also clears history and clipboard
      lastCoalesceKey = null
      persist(d)
      set({ design: d, selectedId: null, selectedIds: [], past: [], future: [], clipboard: null })
    },

    // Load a full Design wholesale (e.g. from a shared URL). Replaces the working
    // design and clears history/selection so it starts a fresh editing session.
    loadDesign: (design) => {
      lastCoalesceKey = null
      persist(design)
      set({ design, selectedId: null, selectedIds: [], past: [], future: [], clipboard: null })
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
      set({ selectedId: id, selectedIds: id ? [id] : [] })
    },
    toggleSelection: (id) => {
      const cur = get().selectedIds
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
      set({ selectedIds: next, selectedId: next.length ? next[next.length - 1] : null })
    },
    setSelection: (ids) => {
      set({ selectedIds: ids, selectedId: ids.length ? ids[ids.length - 1] : null })
    },
    clearSelection: () => {
      set({ selectedIds: [], selectedId: null })
    },
    // Batch box update — one undo step (used for group moves so dragging N elements
    // doesn't create N history entries).
    setBoxes: (updates) => {
      const map = new Map(updates.map(u => [u.id, u.box]))
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => map.has(s.id) ? { ...s, box: map.get(s.id)! } : s),
      }
      commit(d, { coalesceKey: 'setBoxes' })
    },
    // Align every selected element to the SELECTION's bounding box (Figma-style).
    alignSelection: (edge) => {
      const { design, selectedIds } = get()
      if (selectedIds.length < 2) {
        if (selectedIds[0]) get().alignElement(selectedIds[0], edge)
        return
      }
      const canvas = canvasFor(design.format)
      const boxes = selectedIds
        .map(id => design.slots.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map(s => ({ id: s.id, box: slotBox(canvas, design.grid, s) }))
      const minX = Math.min(...boxes.map(b => b.box.x))
      const maxX = Math.max(...boxes.map(b => b.box.x + b.box.w))
      const minY = Math.min(...boxes.map(b => b.box.y))
      const maxY = Math.max(...boxes.map(b => b.box.y + b.box.h))
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const updates = boxes.map(({ id, box }) => {
        let { x, y } = box
        if (edge === 'left') x = minX
        else if (edge === 'right') x = maxX - box.w
        else if (edge === 'centerH') x = cx - box.w / 2
        else if (edge === 'top') y = minY
        else if (edge === 'bottom') y = maxY - box.h
        else if (edge === 'centerV') y = cy - box.h / 2
        return { id, box: { x: Math.round(x), y: Math.round(y), w: Math.round(box.w), h: Math.round(box.h) } }
      })
      get().setBoxes(updates)
    },
    // Even spacing between selected elements along an axis.
    distributeSelection: (axis) => {
      const { design, selectedIds } = get()
      if (selectedIds.length < 3) return
      const canvas = canvasFor(design.format)
      const items = selectedIds
        .map(id => design.slots.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map(s => ({ id: s.id, box: slotBox(canvas, design.grid, s) }))
      const horiz = axis === 'h'
      items.sort((a, b) => horiz ? a.box.x - b.box.x : a.box.y - b.box.y)
      const first = items[0].box
      const last = items[items.length - 1].box
      const start = horiz ? first.x : first.y
      const end = horiz ? last.x : last.y
      const span = end - start
      const step = span / (items.length - 1)
      const updates = items.map((it, i) => {
        const pos = Math.round(start + step * i)
        const box = horiz ? { ...it.box, x: pos } : { ...it.box, y: pos }
        return { id: it.id, box }
      })
      get().setBoxes(updates)
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
      const ids = get().selectedIds.filter(x => x !== id)
      commit(d)
      set({ selectedIds: ids, selectedId: ids.length ? ids[ids.length - 1] : null })
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

    setImageFill: (slotId, src) => {
      const d = { ...get().design, slots: get().design.slots.map(s =>
        s.id === slotId ? { ...s, imageFill: src } : s) }
      commit(d, { coalesceKey: `imagefill:${slotId}` })
    },

    clearImageFill: (slotId) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => {
          if (s.id !== slotId) return s
          const { imageFill: _f, ...rest } = s
          return rest
        }),
      }
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

    setOpacity: (slotId, value) => {
      const clamped = Math.min(1, Math.max(0, value))
      const d = {
        ...get().design,
        slots: get().design.slots.map(s =>
          s.id === slotId ? { ...s, opacity: clamped } : s
        ),
      }
      commit(d, { coalesceKey: `opacity:${slotId}` })
    },

    alignElement: (slotId, edge) => {
      const design = get().design
      const slot = design.slots.find(s => s.id === slotId)
      if (!slot) return
      const canvas = canvasFor(design.format)
      const M = design.grid.margin
      const box = slotBox(canvas, design.grid, slot)

      let newX = box.x
      let newY = box.y

      switch (edge) {
        case 'left':    newX = M; break
        case 'right':   newX = canvas.w - M - box.w; break
        case 'centerH': newX = (canvas.w - box.w) / 2; break
        case 'top':     newY = M; break
        case 'bottom':  newY = canvas.h - M - box.h; break
        case 'centerV': newY = (canvas.h - box.h) / 2; break
      }

      const newBox = {
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(box.w),
        h: Math.round(box.h),
      }

      const d = {
        ...design,
        slots: design.slots.map(s => s.id === slotId ? { ...s, box: newBox } : s),
      }
      commit(d)
    },

    updateSlot: (id, patch, coalesceKey) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s => s.id === id ? { ...s, ...patch } : s),
      }
      commit(d, coalesceKey ? { coalesceKey } : undefined)
    },

    toggleHidden: (id) => {
      const s = get().design.slots.find(x => x.id === id)
      get().updateSlot(id, { hidden: !s?.hidden })
      if (!s?.hidden && get().selectedId === id) set({ selectedId: null }) // deselect when hiding
    },
    toggleLocked: (id) => {
      const s = get().design.slots.find(x => x.id === id)
      get().updateSlot(id, { locked: !s?.locked })
    },
    renameSlot: (id, name) => {
      get().updateSlot(id, { name: name.trim() || undefined }, `name:${id}`)
    },

    setRotation: (id, deg) => {
      get().updateSlot(id, { rotation: deg }, `rotation:${id}`)
    },

    setFlip: (id, axis, on) => {
      get().updateSlot(id, axis === 'H' ? { flipH: on } : { flipV: on })
    },

    setRadius: (id, px) => {
      get().updateSlot(id, { radius: px }, `radius:${id}`)
    },

    setStroke: (id, hexOrToken) => {
      get().updateSlot(id, { stroke: hexOrToken })
    },

    setStrokeWidth: (id, px) => {
      get().updateSlot(id, { strokeWidth: px }, `strokeWidth:${id}`)
    },

    setShadow: (id, shadow) => {
      get().updateSlot(id, { shadow })
    },

    setBlend: (id, mode) => {
      get().updateSlot(id, { blend: mode })
    },

    // -------------------------------------------------------------------------
    // Type pack
    // -------------------------------------------------------------------------

    setTextTransform: (id, v) => {
      get().updateSlot(id, { textTransform: v }, `textTransform:${id}`)
    },

    setIndent: (id, px) => {
      get().updateSlot(id, { indent: px }, `indent:${id}`)
    },

    setListStyle: (id, v) => {
      get().updateSlot(id, { listStyle: v }, `listStyle:${id}`)
    },

    // -------------------------------------------------------------------------
    // Image effects
    // -------------------------------------------------------------------------

    placeImage: (slotId, src) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s =>
          s.id === slotId
            ? { ...s, content: src, imageSrcOriginal: src, imageEffect: undefined }
            : s
        ),
      }
      commit(d)
    },

    setImageEffect: (slotId, effect) => {
      const d = {
        ...get().design,
        slots: get().design.slots.map(s =>
          s.id === slotId ? { ...s, imageEffect: effect } : s
        ),
      }
      commit(d)
    },

    setProcessedImage: (slotId, dataUrl) => {
      // Derived state -- update content directly WITHOUT going through commit().
      // This keeps the processed output out of history so undo only targets
      // the user's effect choices, not the derived pixel result.
      const design = get().design
      const target = design.slots.find(s => s.id === slotId)
      // Equality guard: if content is already this value, do NOTHING. Without this,
      // every write produces a new slots reference, which re-triggers the processor
      // effect -> writes again -> infinite ~8/sec re-process loop.
      if (!target || target.content === dataUrl) return
      const nextSlots = design.slots.map(s =>
        s.id === slotId ? { ...s, content: dataUrl } : s
      )
      const next = { ...design, slots: nextSlots }
      // persist to localStorage so the result survives a refresh
      persist(next)
      set({ design: next })
    },

    // -------------------------------------------------------------------------
    // Riff / variation explorer
    // -------------------------------------------------------------------------

    openRiff: () => {
      set({ riffOpen: true })
    },

    setCommandOpen: (v) => {
      set({ commandOpen: v })
    },

    setMotionEffect: (e) => {
      set({ motionEffect: e })
    },

    closeRiff: () => {
      set({ riffOpen: false })
    },

    setRiffStrength: (n) => {
      set({ riffStrength: Math.max(0, Math.min(1, n)) })
    },

    seedRiff: () => {
      const { design, riffTree } = get()
      // Only create root if tree is empty
      if (riffTree.rootId !== null) return
      const id = nextRiffId()
      const node = { id, parentId: null, design }
      set({
        riffTree: {
          nodes: { [id]: node },
          rootId: id,
          currentId: id,
        },
      })
    },

    applyRiff: (design) => {
      const { riffTree } = get()
      const id = nextRiffId()
      const parentId = riffTree.currentId
      const node = { id, parentId, design }
      const nodes = { ...riffTree.nodes, [id]: node }
      // Commit as undoable history step
      commit(design)
      set({
        riffTree: {
          nodes,
          rootId: riffTree.rootId,
          currentId: id,
        },
      })
    },

    gotoRiffNode: (id) => {
      const { riffTree } = get()
      const node = riffTree.nodes[id]
      if (!node) return
      commit(node.design)
      set({
        riffTree: {
          ...riffTree,
          currentId: id,
        },
      })
    },
  }
})

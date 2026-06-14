// src/ui/useKeyboardShortcuts.ts
//
// Single global keydown handler mounted once in App.tsx.
// Consolidates all shortcuts that were previously split across ComposerOverlay.
//
import { useEffect } from 'react'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'

/** Returns true when the event target is an editable field (input / textarea / contentEditable). */
function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (target.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts() {
  const undo = useDesign(s => s.undo)
  const redo = useDesign(s => s.redo)
  const copySelected = useDesign(s => s.copySelected)
  const cutSelected = useDesign(s => s.cutSelected)
  const paste = useDesign(s => s.paste)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const deleteElement = useDesign(s => s.deleteElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  const selectElement = useDesign(s => s.selectElement)
  const addElement = useDesign(s => s.addElement)
  const setBox = useDesign(s => s.setBox)
  const setZoom = useDesign(s => s.setZoom)
  const zoomToFit = useDesign(s => s.zoomToFit)
  const zoomTo100 = useDesign(s => s.zoomTo100)

  // We read these inline via get() rather than subscribing so the listener
  // closure never becomes stale on design/selection changes.
  const getState = useDesign.getState

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — command palette. Works even while typing (toggle), so it's
      // checked before the editable-target guard.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        const s = getState()
        s.setCommandOpen(!s.commandOpen)
        return
      }

      // Let native input fields handle their own keys — no global shortcuts while typing.
      if (isEditableTarget(e)) return

      const mod = e.metaKey || e.ctrlKey

      // ── Undo / Redo ──────────────────────────────────────────────────────────
      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (mod && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // ── Clipboard ────────────────────────────────────────────────────────────
      if (mod && e.key === 'c') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          copySelected()
        }
        return
      }
      if (mod && e.key === 'x') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          cutSelected()
        }
        return
      }
      if (mod && e.key === 'v') {
        const { clipboard } = getState()
        if (clipboard) {
          e.preventDefault()
          paste()
        }
        return
      }

      // ── Duplicate ────────────────────────────────────────────────────────────
      if (mod && e.key === 'd') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          duplicateElement(selectedId)
        }
        return
      }

      // ── Z-order ──────────────────────────────────────────────────────────────
      if (mod && e.key === ']') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          bringForward(selectedId)
        }
        return
      }
      if (mod && e.key === '[') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          sendBackward(selectedId)
        }
        return
      }

      // ── Select all ───────────────────────────────────────────────────────────
      if (mod && e.key === 'a') {
        e.preventDefault()
        getState().setSelection(getState().design.slots.map(s => s.id))
        return
      }

      // ── Delete / Backspace (whole selection) ─────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = getState()
        if (selectedIds.length) {
          e.preventDefault()
          // delete a copy — deleteElement mutates the selection as it goes
          for (const id of [...selectedIds]) deleteElement(id)
        }
        return
      }

      // ── Arrow nudge (whole selection) ────────────────────────────────────────
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const { selectedIds, design } = getState()
        if (!selectedIds.length) return
        e.preventDefault()
        const canvas = canvasFor(design.format)
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const updates = selectedIds
          .map(id => design.slots.find(s => s.id === id))
          .filter((s): s is NonNullable<typeof s> => !!s)
          .map(s => {
            const b = slotBox(canvas, design.grid, s)
            return { id: s.id, box: { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h } }
          })
        getState().setBoxes(updates)
        return
      }

      // ── Escape ───────────────────────────────────────────────────────────────
      if (e.key === 'Escape') {
        selectElement(null)
        return
      }

      // ── Tool keys (single key, no modifier) ──────────────────────────────────
      if (!mod) {
        switch (e.key) {
          case 't': addElement('text'); return
          case 'i': addElement('image'); return
          case 'r': addElement('block'); return
          case 'l': addElement('line'); return
        }
      }

      // ── Zoom shortcuts ────────────────────────────────────────────────────────
      // Zoom in: Cmd/Ctrl + or Cmd/Ctrl =
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoom(getState().zoom * 1.25)
        return
      }
      // Zoom out: Cmd/Ctrl -
      if (mod && e.key === '-') {
        e.preventDefault()
        setZoom(getState().zoom / 1.25)
        return
      }
      // Fit to screen: Cmd/Ctrl 0
      if (mod && e.key === '0') {
        e.preventDefault()
        zoomToFit()
        return
      }
      // 100% fit scale: Cmd/Ctrl 1
      if (mod && e.key === '1') {
        e.preventDefault()
        zoomTo100()
        return
      }
      // 100% fit scale: Shift+1 (produces '!' in most browsers)
      if (!mod && e.shiftKey && e.key === '!') {
        e.preventDefault()
        zoomTo100()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    undo, redo,
    copySelected, cutSelected, paste,
    duplicateElement, deleteElement,
    bringForward, sendBackward,
    selectElement, addElement, setBox,
    setZoom, zoomToFit, zoomTo100,
    getState,
  ])
}

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

  // We read these inline via get() rather than subscribing so the listener
  // closure never becomes stale on design/selection changes.
  const getState = useDesign.getState

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

      // ── Delete / Backspace ───────────────────────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId } = getState()
        if (selectedId) {
          e.preventDefault()
          deleteElement(selectedId)
        }
        return
      }

      // ── Arrow nudge ──────────────────────────────────────────────────────────
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const { selectedId, design } = getState()
        if (!selectedId) return
        e.preventDefault()
        const slot = design.slots.find(s => s.id === selectedId)
        if (!slot) return
        const canvas = canvasFor(design.format)
        const b = slotBox(canvas, design.grid, slot)
        const step = e.shiftKey ? 10 : 1
        let { x, y, w, h } = b
        if (e.key === 'ArrowLeft')  x -= step
        if (e.key === 'ArrowRight') x += step
        if (e.key === 'ArrowUp')    y -= step
        if (e.key === 'ArrowDown')  y += step
        setBox(selectedId, { x, y, w, h })
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
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    undo, redo,
    copySelected, cutSelected, paste,
    duplicateElement, deleteElement,
    bringForward, sendBackward,
    selectElement, addElement, setBox,
    getState,
  ])
}

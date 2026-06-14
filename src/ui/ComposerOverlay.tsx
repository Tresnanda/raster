import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { orderedSlots } from '../design/order'
import { resolveTextStyle } from '../render/resolve-style'
import { FONT_STACK } from '../lib/measure'
import { classOf } from '../design/typeclass'
import type { Slot } from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum element size in canvas units */
const MIN_SIZE = 24

/** Snap threshold in canvas units */
const SNAP_THRESHOLD = 12

/** Center-snap threshold in screen pixels — converted to canvas units on use */
const CENTER_SNAP_PX = 8

/** Handle visual size in screen px (we undo the canvas scale to keep them constant) */
const HANDLE_PX = 8

/** Handle positions: [xFrac, yFrac] of the box, used for hit detection & drag axis */
type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { id: HandleId; x: number; y: number }[] = [
  { id: 'nw', x: 0,   y: 0   },
  { id: 'n',  x: 0.5, y: 0   },
  { id: 'ne', x: 1,   y: 0   },
  { id: 'e',  x: 1,   y: 0.5 },
  { id: 'se', x: 1,   y: 1   },
  { id: 's',  x: 0.5, y: 1   },
  { id: 'sw', x: 0,   y: 1   },
  { id: 'w',  x: 0,   y: 0.5 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTextSlot(slot: Slot): boolean {
  return slot.role !== 'image' && slot.role !== 'block' && slot.role !== 'line'
}

function isImageSlot(slot: Slot): boolean {
  return slot.role === 'image'
}

function slotColor(slot: Slot, design: { palette: { accent: string; text: string }; style: { accentHeadline: boolean } }): string {
  if (slot.color) return slot.color
  const tc = slot.typeClass ?? (isTextSlot(slot) ? classOf(slot.role as never) : undefined)
  if (design.style.accentHeadline && tc === 'title') return design.palette.accent
  return design.palette.text
}

/** Compute grid snap boundaries */
function gridBoundaries(canvas: { w: number; h: number }, grid: { cols: number; rows: number; margin: number; gutter: number }): { xs: number[]; ys: number[] } {
  const { cols, rows, margin, gutter } = grid
  const colW = (canvas.w - 2 * margin - (cols - 1) * gutter) / cols
  const rowH = (canvas.h - 2 * margin - (rows - 1) * gutter) / rows
  const xs: number[] = []
  const ys: number[] = []
  for (let c = 0; c <= cols; c++) {
    xs.push(margin + c * (colW + gutter) - (c < cols ? 0 : gutter))
  }
  for (let r = 0; r <= rows; r++) {
    ys.push(margin + r * (rowH + gutter) - (r < rows ? 0 : gutter))
  }
  return { xs, ys }
}

function snapToNearest(val: number, boundaries: number[], threshold: number): number {
  let best = val
  let bestDist = threshold
  for (const b of boundaries) {
    const d = Math.abs(val - b)
    if (d < bestDist) { bestDist = d; best = b }
  }
  return best
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ComposerOverlayProps {
  scale: number
  /** Current canvas zoom. The overlay lives inside the zoom-scaled stage, so its
   *  own CSS transform must be divided by zoom to avoid double-scaling (the parent
   *  already applies `scale(zoom)`). All pointer/handle math still uses the true
   *  total screen scale (`scale`). */
  zoom?: number
  snap?: boolean
}

export function ComposerOverlay({ scale, zoom = 1, snap = true }: ComposerOverlayProps) {
  const design = useDesign(s => s.design)
  const selectedId = useDesign(s => s.selectedId)
  const selectedIds = useDesign(s => s.selectedIds)
  const selectElement = useDesign(s => s.selectElement)
  const toggleSelection = useDesign(s => s.toggleSelection)
  const setSelection = useDesign(s => s.setSelection)
  const setBox = useDesign(s => s.setBox)
  const setBoxes = useDesign(s => s.setBoxes)
  const setContent = useDesign(s => s.setContent)
  const requestCrop = useDesign(s => s.requestCrop)
  const deleteElement = useDesign(s => s.deleteElement)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  const saveSelectedComponent = useDesign(s => s.saveSelectedComponent)
  const autoTidy = useDesign(s => s.autoTidy)
  // Note: global keyboard shortcuts (Delete, arrows, Cmd+D, Esc, etc.) are handled
  // by useKeyboardShortcuts in App.tsx — not here. Only textarea-local handling remains.

  const canvas = canvasFor(design.format)
  const safeScale = scale > 0 ? scale : 1

  const [editingId, setEditingId] = useState<string | null>(null)
  // Per-image drag-over tracking
  const [imageDragOverId, setImageDragOverId] = useState<string | null>(null)
  // Smart-guide lines (canvas-unit positions) shown while dragging, and a small
  // dimensions HUD with the live x/y/w/h of the element under the pointer.
  const [guideLines, setGuideLines] = useState<{ vx: number[]; hy: number[] }>({ vx: [], hy: [] })
  const [hud, setHud] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // Marquee rubber-band rect (canvas units) while drag-selecting on empty canvas.
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slotId: string } | null>(null)

  const slots = orderedSlots(design).filter(s => !s.hidden) // hidden layers aren't interactive
  const boundaries = gridBoundaries(canvas, design.grid)

  // Root ref for useGSAP scope
  const overlayRef = useRef<HTMLDivElement>(null)

  // ── Motion: selection outline animate in ─────────────────────────────────
  // When selectedId changes to a non-null value, fade+scale the slot div in.
  // Kept very fast (120ms) — selection is frequent, motion must be subtle.
  useGSAP(() => {
    if (!selectedId || !overlayRef.current) return
    const slotEl = overlayRef.current.querySelector<HTMLElement>(
      `[data-composer-slot="${CSS.escape(selectedId)}"]`,
    )
    if (!slotEl) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(slotEl, {
        opacity: 0,
        scale: 0.98,
        transformOrigin: '50% 50%',
        duration: 0.12,
        ease: 'power3.out',
        force3D: true,
        // Only animate the visual overlay, not the element content itself —
        // we can't easily isolate just the outline, so we do a very subtle
        // scale on the whole slot div (barely perceptible, 0.98 → 1).
      })
    })
    // Reduced motion: instant (no animation added)
    return () => mm.revert()
  }, { scope: overlayRef, dependencies: [selectedId] })

  // ── Move drag ─────────────────────────────────────────────────────────────

  function startMove(slot: Slot, e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()

    // Move the whole selection if the grabbed element is part of a multi-selection.
    const sel = useDesign.getState().selectedIds
    const movingIds = sel.length > 1 && sel.includes(slot.id) ? sel : [slot.id]
    const startBoxes = new Map(
      movingIds.map(id => [id, slotBox(canvas, design.grid, design.slots.find(s => s.id === id)!)]),
    )
    const primary = startBoxes.get(slot.id)!
    const startX = e.clientX
    const startY = e.clientY
    const T = CENTER_SNAP_PX / safeScale

    // Smart-guide targets: canvas center + edges + every OTHER element's edges/centers.
    const others = slots.filter(s => !movingIds.includes(s.id))
    const otherBoxes = others.map(s => slotBox(canvas, design.grid, s))
    const vTargets = [canvas.w / 2, 0, canvas.w, ...otherBoxes.flatMap(b => [b.x, b.x + b.w / 2, b.x + b.w])]
    const hTargets = [canvas.h / 2, 0, canvas.h, ...otherBoxes.flatMap(b => [b.y, b.y + b.h / 2, b.y + b.h])]

    const move = (ev: PointerEvent) => {
      let dx = (ev.clientX - startX) / safeScale
      let dy = (ev.clientY - startY) / safeScale
      if (ev.shiftKey) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0 }

      let px = primary.x + dx
      let py = primary.y + dy

      // Grid snap (left/top edge) when enabled.
      if (snap) {
        px = snapToNearest(px, boundaries.xs, SNAP_THRESHOLD)
        py = snapToNearest(py, boundaries.ys, SNAP_THRESHOLD)
      }

      // Smart guides: snap the primary's left/center/right edge to any target.
      const vGuides: number[] = []
      const hGuides: number[] = []
      for (const edge of [px, px + primary.w / 2, px + primary.w]) {
        let best = Infinity, bestT = 0
        for (const t of vTargets) { const d = Math.abs(edge - t); if (d < best) { best = d; bestT = t } }
        if (best < T) { px += bestT - edge; vGuides.push(bestT); break }
      }
      for (const edge of [py, py + primary.h / 2, py + primary.h]) {
        let best = Infinity, bestT = 0
        for (const t of hTargets) { const d = Math.abs(edge - t); if (d < best) { best = d; bestT = t } }
        if (best < T) { py += bestT - edge; hGuides.push(bestT); break }
      }

      const adx = px - primary.x
      const ady = py - primary.y
      setBoxes(movingIds.map(id => {
        const sb = startBoxes.get(id)!
        return { id, box: { ...sb, x: Math.round(sb.x + adx), y: Math.round(sb.y + ady) } }
      }))
      setGuideLines({ vx: vGuides, hy: hGuides })
      setHud({ x: Math.round(px), y: Math.round(py), w: Math.round(primary.w), h: Math.round(primary.h) })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setGuideLines({ vx: [], hy: [] })
      setHud(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ── Resize drag ───────────────────────────────────────────────────────────

  function startResize(slot: Slot, handle: HandleId, e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()

    const startBox = slotBox(canvas, design.grid, slot)
    const startX = e.clientX
    const startY = e.clientY

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / safeScale
      const dy = (ev.clientY - startY) / safeScale

      let { x, y, w, h } = startBox

      // Horizontal: west handles move x and shrink w; east handles grow w
      if (handle.includes('w')) {
        const rawX = startBox.x + dx
        const snapX = snap ? snapToNearest(rawX, boundaries.xs, SNAP_THRESHOLD) : rawX
        const newW = startBox.x + startBox.w - snapX
        if (newW >= MIN_SIZE) { x = snapX; w = newW }
      } else if (handle.includes('e')) {
        const rawRight = startBox.x + startBox.w + dx
        const snapRight = snap ? snapToNearest(rawRight, boundaries.xs, SNAP_THRESHOLD) : rawRight
        w = Math.max(MIN_SIZE, snapRight - startBox.x)
      }

      // Vertical: north handles move y and shrink h; south handles grow h
      if (handle.startsWith('n')) {
        const rawY = startBox.y + dy
        const snapY = snap ? snapToNearest(rawY, boundaries.ys, SNAP_THRESHOLD) : rawY
        const newH = startBox.y + startBox.h - snapY
        if (newH >= MIN_SIZE) { y = snapY; h = newH }
      } else if (handle.startsWith('s')) {
        const rawBottom = startBox.y + startBox.h + dy
        const snapBottom = snap ? snapToNearest(rawBottom, boundaries.ys, SNAP_THRESHOLD) : rawBottom
        h = Math.max(MIN_SIZE, snapBottom - startBox.y)
      }

      setBox(slot.id, { x, y, w, h })
      setHud({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setHud(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ── Image drop handler ────────────────────────────────────────────────────

  function handleImageDrop(slotId: string, e: React.DragEvent) {
    e.preventDefault()
    setImageDragOverId(null)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      // Phase C: route through CropModal before setContent
      requestCrop(slotId, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // Handle size in canvas units (constant screen size = HANDLE_PX / scale)
  const handleSize = HANDLE_PX / safeScale

  return (
    <div
      ref={overlayRef}
      data-composer-overlay
      className="absolute inset-0 overflow-hidden"
      style={{
        width: canvas.w,
        height: canvas.h,
        // Divide by zoom: the parent stage already applies scale(zoom), so the
        // overlay's own transform must be the un-zoomed base scale to line up 1:1
        // with the SVG. Pointer/handle math below still uses the full `safeScale`.
        transform: `scale(${safeScale / (zoom > 0 ? zoom : 1)})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      {/* Background — captures clicks (deselect) + marquee rubber-band selection. */}
      <div
        data-overlay-bg
        style={{ position: 'absolute', inset: 0, pointerEvents: 'all' }}
        onClick={() => { setContextMenu(null); if (!editingId) selectElement(null) }}
        onPointerDown={e => {
          if (editingId) return
          if (e.button !== 0) return
          e.preventDefault()
          const rect = overlayRef.current!.getBoundingClientRect()
          const toCanvas = (cx: number, cy: number) => ({
            x: (cx - rect.left) / safeScale,
            y: (cy - rect.top) / safeScale,
          })
          const start = toCanvas(e.clientX, e.clientY)
          let moved = false
          const move = (ev: PointerEvent) => {
            const p = toCanvas(ev.clientX, ev.clientY)
            moved = true
            setMarquee({
              x: Math.min(start.x, p.x), y: Math.min(start.y, p.y),
              w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y),
            })
          }
          const up = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
            const p = toCanvas(ev.clientX, ev.clientY)
            const r = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }
            if (moved && (r.w > 4 || r.h > 4)) {
              const hits = slots.filter(s => {
                const bx = slotBox(canvas, design.grid, s)
                return bx.x < r.x + r.w && bx.x + bx.w > r.x && bx.y < r.y + r.h && bx.y + bx.h > r.y
              }).map(s => s.id)
              setSelection(hits)
            } else {
              selectElement(null)
            }
            setMarquee(null)
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
        }}
      />

      {/* Smart-guide lines while dragging (element + canvas alignment). */}
      {guideLines.vx.map((x, i) => (
        <div key={`v${i}`} data-guide-x aria-hidden style={{ position: 'absolute', left: x, top: 0, width: 1 / safeScale, height: canvas.h, background: '#ec4899', opacity: 0.9, pointerEvents: 'none' }} />
      ))}
      {guideLines.hy.map((y, i) => (
        <div key={`h${i}`} data-guide-y aria-hidden style={{ position: 'absolute', left: 0, top: y, width: canvas.w, height: 1 / safeScale, background: '#ec4899', opacity: 0.9, pointerEvents: 'none' }} />
      ))}

      {/* Marquee rubber-band */}
      {marquee && (
        <div data-marquee aria-hidden style={{ position: 'absolute', left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, border: `${1 / safeScale}px solid #3b82f6`, background: 'rgba(59,130,246,0.08)', pointerEvents: 'none' }} />
      )}

      {/* Dimensions HUD — live x/y · w×h while dragging/resizing. */}
      {hud && (
        <div
          data-dims-hud
          aria-hidden
          style={{
            position: 'absolute',
            left: hud.x,
            top: hud.y,
            transform: `translate(0, calc(-100% - ${6 / safeScale}px)) scale(${1 / safeScale})`,
            transformOrigin: 'top left',
            background: '#18181b',
            color: '#fafafa',
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: 11,
            lineHeight: 1.4,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {hud.x}, {hud.y} · {hud.w}×{hud.h}
        </div>
      )}

      {contextMenu && (
        <div
          data-composer-context-menu
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            display: 'grid',
            gap: 1,
            minWidth: 150,
            padding: 4,
            background: '#ffffff',
            border: `${1.5 / safeScale}px solid #18181b`,
            boxShadow: `${3 / safeScale}px ${3 / safeScale}px 0 0 #18181b`,
            zIndex: 80,
            transform: `scale(${1 / safeScale})`,
            transformOrigin: 'top left',
            pointerEvents: 'all',
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {([
            ['Duplicate', () => duplicateElement(contextMenu.slotId)],
            ['Bring forward', () => bringForward(contextMenu.slotId)],
            ['Send backward', () => sendBackward(contextMenu.slotId)],
            ['Save as component', () => saveSelectedComponent('Component')],
            ['Auto-tidy from context', () => autoTidy()],
            ['Delete', () => deleteElement(contextMenu.slotId)],
          ] as const).map(([label, action]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={e => {
                e.stopPropagation()
                action()
                setContextMenu(null)
              }}
              style={contextMenuBtnStyle}
            >
              {label === 'Auto-tidy from context' ? 'Auto-tidy' : label}
            </button>
          ))}
        </div>
      )}

      {slots.map(slot => {
        const b = slotBox(canvas, design.grid, slot)
        const isSelected = selectedIds.includes(slot.id)
        const isEditing = editingId === slot.id
        const isImage = isImageSlot(slot)
        const isText = isTextSlot(slot)
        const isDragOver = imageDragOverId === slot.id

        return (
          <div
            key={slot.id}
            data-composer-slot={slot.id}
            data-slot-role={slot.role}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              pointerEvents: 'all',
              cursor: isEditing ? 'text' : slot.locked ? 'default' : 'move',
              boxSizing: 'border-box',
              // Selection outline (amber for locked, blue otherwise)
              outline: isSelected ? `1px solid ${slot.locked ? '#d97706' : '#3b82f6'}` : undefined,
            }}
            onClick={e => {
              e.stopPropagation()
              setContextMenu(null)
              if (isEditing) return
              // Shift/Cmd-click toggles; plain click selects just this element.
              if (e.shiftKey || e.metaKey || e.ctrlKey) toggleSelection(slot.id)
              else selectElement(slot.id)
            }}
            onContextMenu={e => {
              e.preventDefault()
              e.stopPropagation()
              const rect = overlayRef.current!.getBoundingClientRect()
              const x = (e.clientX - rect.left) / safeScale
              const y = (e.clientY - rect.top) / safeScale
              if (!selectedIds.includes(slot.id)) selectElement(slot.id)
              setContextMenu({ x, y, slotId: slot.id })
            }}
            onDoubleClick={e => {
              e.stopPropagation()
              if (isText && !slot.locked) {
                selectElement(slot.id)
                setEditingId(slot.id)
              }
            }}
            onPointerDown={e => {
              if (isEditing) return
              e.stopPropagation() // don't let the background start a marquee
              const additive = e.shiftKey || e.metaKey || e.ctrlKey
              if (additive) {
                // shift+drag: leave selection to the click handler (toggle)
                return
              }
              // If this element isn't already in a multi-selection, select just it.
              const sel = useDesign.getState().selectedIds
              if (!(sel.length > 1 && sel.includes(slot.id))) selectElement(slot.id)
              // Locked layers select but never move.
              if (!slot.locked) startMove(slot, e)
            }}
            // Image drag-and-drop
            onDragOver={isImage ? e => { e.preventDefault(); setImageDragOverId(slot.id) } : undefined}
            onDragLeave={isImage ? () => setImageDragOverId(null) : undefined}
            onDrop={isImage ? e => handleImageDrop(slot.id, e) : undefined}
          >
            {/* Image drop ring */}
            {isImage && isDragOver && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  outline: '2px dashed rgba(59,130,246,0.7)',
                  background: 'rgba(59,130,246,0.08)',
                }}
              />
            )}

            {/* Hover hint for image slot (when not selected) */}
            {isImage && !isSelected && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none"
                style={{ transition: 'opacity 120ms' }}
              >
                <span
                  style={{
                    fontSize: Math.max(14, b.w * 0.05),
                    color: 'rgba(148,163,184,0.9)',
                    userSelect: 'none',
                    textAlign: 'center',
                    padding: '0 8px',
                  }}
                >
                  drop image
                </span>
              </div>
            )}

            {/* Inline text editor */}
            {isText && isEditing && (() => {
              const textStyle = resolveTextStyle(slot, design.typography)
              const color = slotColor(slot, design)
              const fontFamily = FONT_STACK[textStyle.family]
              return (
                <textarea
                  autoFocus
                  data-edit-textarea={slot.id}
                  value={slot.content}
                  onChange={e => setContent(slot.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      selectElement(null)
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      setEditingId(null)
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    resize: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    overflow: 'hidden',
                    fontFamily,
                    fontWeight: textStyle.weight,
                    fontSize: textStyle.size,
                    letterSpacing: `${textStyle.tracking}em`,
                    lineHeight: textStyle.leading,
                    textAlign: textStyle.align,
                    color,
                    background: design.palette.bg,
                    caretColor: color,
                    zIndex: 10,
                  }}
                />
              )
            })()}

            {/* Selection: 8 resize handles + floating toolbar (not for locked) */}
            {isSelected && !isEditing && !slot.locked && (
              <>
                {/* Resize handles */}
                {HANDLES.map(h => (
                  <div
                    key={h.id}
                    data-handle={h.id}
                    onPointerDown={e => {
                      e.stopPropagation()
                      startResize(slot, h.id, e)
                    }}
                    style={{
                      position: 'absolute',
                      // Position center of handle at the fractional point
                      left: b.w * h.x - handleSize / 2,
                      top: b.h * h.y - handleSize / 2,
                      width: handleSize,
                      height: handleSize,
                      background: '#fff',
                      border: '1.5px solid #3b82f6',
                      boxSizing: 'border-box',
                      cursor: resizeCursor(h.id),
                      zIndex: 20,
                    }}
                  />
                ))}

                {/* Floating toolbar */}
                <div
                  data-composer-toolbar
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 4,
                    display: 'flex',
                    gap: 2,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    padding: '2px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    whiteSpace: 'nowrap',
                    zIndex: 30,
                    // Counter-scale so toolbar text is readable
                    transform: `scale(${1 / safeScale})`,
                    transformOrigin: 'bottom left',
                    fontSize: 11,
                    fontFamily: "'Inter', sans-serif",
                    pointerEvents: 'all',
                  }}
                >
                  <button
                    aria-label="Duplicate"
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onClick={e => { e.stopPropagation(); duplicateElement(slot.id) }}
                    style={toolbarBtnStyle}
                  >
                    Copy
                  </button>
                  <button
                    aria-label="Bring forward"
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onClick={e => { e.stopPropagation(); bringForward(slot.id) }}
                    style={toolbarBtnStyle}
                  >
                    Fwd
                  </button>
                  <button
                    aria-label="Send backward"
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onClick={e => { e.stopPropagation(); sendBackward(slot.id) }}
                    style={toolbarBtnStyle}
                  >
                    Back
                  </button>
                  <button
                    aria-label="Delete"
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onClick={e => { e.stopPropagation(); deleteElement(slot.id) }}
                    style={{ ...toolbarBtnStyle, color: '#ef4444' }}
                  >
                    Del
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Toolbar button base style ────────────────────────────────────────────────

const toolbarBtnStyle: React.CSSProperties = {
  padding: '2px 6px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 3,
  color: '#374151',
  fontSize: 'inherit',
  fontFamily: 'inherit',
}

const contextMenuBtnStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: 'none',
  background: 'transparent',
  color: '#18181b',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "'Inter', sans-serif",
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function resizeCursor(h: HandleId): React.CSSProperties['cursor'] {
  switch (h) {
    case 'nw': case 'se': return 'nwse-resize'
    case 'ne': case 'sw': return 'nesw-resize'
    case 'n':  case 's':  return 'ns-resize'
    case 'e':  case 'w':  return 'ew-resize'
  }
}

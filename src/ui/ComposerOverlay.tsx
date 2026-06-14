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
  snap?: boolean
}

export function ComposerOverlay({ scale, snap = true }: ComposerOverlayProps) {
  const design = useDesign(s => s.design)
  const selectedId = useDesign(s => s.selectedId)
  const selectElement = useDesign(s => s.selectElement)
  const setBox = useDesign(s => s.setBox)
  const setContent = useDesign(s => s.setContent)
  const requestCrop = useDesign(s => s.requestCrop)
  const deleteElement = useDesign(s => s.deleteElement)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  // Note: global keyboard shortcuts (Delete, arrows, Cmd+D, Esc, etc.) are handled
  // by useKeyboardShortcuts in App.tsx — not here. Only textarea-local handling remains.

  const canvas = canvasFor(design.format)
  const safeScale = scale > 0 ? scale : 1

  const [editingId, setEditingId] = useState<string | null>(null)
  // Per-image drag-over tracking
  const [imageDragOverId, setImageDragOverId] = useState<string | null>(null)
  // Center-snap guide state
  const [centerGuides, setCenterGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false })

  const slots = orderedSlots(design)
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

    const startBox = slotBox(canvas, design.grid, slot)
    const startX = e.clientX
    const startY = e.clientY
    const centerSnapThreshold = CENTER_SNAP_PX / safeScale

    const move = (ev: PointerEvent) => {
      const rawDx = (ev.clientX - startX) / safeScale
      const rawDy = (ev.clientY - startY) / safeScale

      let dx = rawDx
      let dy = rawDy

      // Axis lock when Shift
      if (ev.shiftKey) {
        if (Math.abs(rawDx) >= Math.abs(rawDy)) dy = 0
        else dx = 0
      }

      let newX = startBox.x + dx
      let newY = startBox.y + dy

      if (snap) {
        newX = snapToNearest(newX, boundaries.xs, SNAP_THRESHOLD)
        newY = snapToNearest(newY, boundaries.ys, SNAP_THRESHOLD)
      }

      // Center-snap: check dragged element center vs canvas center
      const elCenterX = newX + startBox.w / 2
      const elCenterY = newY + startBox.h / 2
      const canvasCenterX = canvas.w / 2
      const canvasCenterY = canvas.h / 2

      let snapX = false
      let snapY = false

      if (Math.abs(elCenterX - canvasCenterX) < centerSnapThreshold) {
        newX = canvasCenterX - startBox.w / 2
        snapX = true
      }

      if (Math.abs(elCenterY - canvasCenterY) < centerSnapThreshold) {
        newY = canvasCenterY - startBox.h / 2
        snapY = true
      }

      setCenterGuides({ x: snapX, y: snapY })
      setBox(slot.id, { ...startBox, x: newX, y: newY })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setCenterGuides({ x: false, y: false })
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
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
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
        transform: `scale(${safeScale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
      // Clicking the overlay background deselects
      onClick={() => {
        if (editingId) return
        selectElement(null)
      }}
    >
      {/* Center-snap guide lines — only visible during active snapped drag */}
      {centerGuides.x && (
        <div
          data-center-guide-x
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: canvas.w / 2,
            top: 0,
            width: 1 / safeScale,
            height: canvas.h,
            background: '#3b82f6',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
      )}
      {centerGuides.y && (
        <div
          data-center-guide-y
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: canvas.h / 2,
            width: canvas.w,
            height: 1 / safeScale,
            background: '#3b82f6',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
      )}

      {slots.map(slot => {
        const b = slotBox(canvas, design.grid, slot)
        const isSelected = selectedId === slot.id
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
              cursor: isEditing ? 'text' : 'move',
              boxSizing: 'border-box',
              // Selection outline
              outline: isSelected ? '1px solid #3b82f6' : undefined,
            }}
            onClick={e => {
              e.stopPropagation()
              if (!isEditing) selectElement(slot.id)
            }}
            onDoubleClick={e => {
              e.stopPropagation()
              if (isText) {
                selectElement(slot.id)
                setEditingId(slot.id)
              }
            }}
            onPointerDown={e => {
              if (isEditing) return
              // Select on pointerdown; move starts on drag
              selectElement(slot.id)
              startMove(slot, e)
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

            {/* Selection: 8 resize handles + floating toolbar */}
            {isSelected && !isEditing && (
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

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function resizeCursor(h: HandleId): React.CSSProperties['cursor'] {
  switch (h) {
    case 'nw': case 'se': return 'nwse-resize'
    case 'ne': case 'sw': return 'nesw-resize'
    case 'n':  case 's':  return 'ns-resize'
    case 'e':  case 'w':  return 'ew-resize'
  }
}

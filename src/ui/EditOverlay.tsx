import { useRef, useState } from 'react'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { resolveTextStyle } from '../render/resolve-style'
import { FONT_STACK } from '../lib/measure'
import { classOf } from '../design/typeclass'

/**
 * EditOverlay — an HTML overlay sized in canvas units, CSS-scaled to match the
 * SVG. Click a text slot to edit it in place; click or drop an image onto the
 * image slot.
 */
export function EditOverlay({ scale }: { scale: number }) {
  const design = useDesign(s => s.design)
  const setContent = useDesign(s => s.setContent)
  const canvas = canvasFor(design.format)

  // Which slot is currently in text-edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  // Whether the image drop zone is being hovered by a drag
  const [imageDragOver, setImageDragOver] = useState(false)

  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const safeScale = scale > 0 ? scale : 1

  /** Derive the CSS text color for a slot, mirroring the renderer logic. */
  function slotColor(slot: { role: string; typeClass?: string }): string {
    const { palette, style } = design
    const tc = slot.typeClass ?? (slot.role !== 'image' && slot.role !== 'block' ? classOf(slot.role as never) : undefined)
    if (style.accentHeadline && tc === 'title') return palette.accent
    return palette.text
  }

  function handleImageFile(slotId: string, file: File) {
    const reader = new FileReader()
    reader.onload = () => setContent(slotId, String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        width: canvas.w,
        height: canvas.h,
        transform: `scale(${safeScale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      {design.slots.map(slot => {
        const b = slotBox(canvas, design.grid, slot)
        const isImage = slot.role === 'image'
        const isBlock = slot.role === 'block'
        const isText = !isImage && !isBlock && slot.text

        // --- IMAGE SLOT ---
        if (isImage) {
          return (
            <div
              key={slot.id}
              data-edit-slot={slot.id}
              data-slot-type="image"
              className="absolute"
              style={{
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                pointerEvents: 'all',
                cursor: 'pointer',
              }}
              onClick={() => {
                const input = fileInputRefs.current.get(slot.id)
                input?.click()
              }}
              onDragOver={e => {
                e.preventDefault()
                setImageDragOver(true)
              }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setImageDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleImageFile(slot.id, file)
              }}
            >
              {/* Hidden file input for click-to-upload */}
              <input
                ref={el => {
                  if (el) fileInputRefs.current.set(slot.id, el)
                  else fileInputRefs.current.delete(slot.id)
                }}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImageFile(slot.id, file)
                  // Reset so the same file can be re-selected
                  e.target.value = ''
                }}
              />
              {/* Drop hint: only visible on hover / drag */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{
                  outline: imageDragOver ? '2px dashed rgba(148,163,184,0.7)' : undefined,
                  background: imageDragOver ? 'rgba(148,163,184,0.12)' : undefined,
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(14, b.w * 0.06),
                    color: 'rgba(148,163,184,0.9)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    textAlign: 'center',
                    padding: '0 8px',
                  }}
                >
                  {imageDragOver ? 'drop image' : 'click or drop image'}
                </span>
              </div>
            </div>
          )
        }

        // --- TEXT SLOT ---
        if (isText) {
          const style = resolveTextStyle(slot, design.typography)
          const color = slotColor(slot)
          const fontFamily = FONT_STACK[style.family]
          const isEditing = editingId === slot.id

          return (
            <div
              key={slot.id}
              data-edit-slot={slot.id}
              data-slot-type="text"
              className="absolute"
              style={{
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                pointerEvents: 'all',
                cursor: 'text',
              }}
              onClick={() => {
                if (!isEditing) setEditingId(slot.id)
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  data-edit-textarea={slot.id}
                  value={slot.content}
                  onChange={e => setContent(slot.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setEditingId(null)
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      setEditingId(null)
                    }
                  }}
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
                    // Match the rendered text visually
                    fontFamily,
                    fontWeight: style.weight,
                    fontSize: style.size,
                    letterSpacing: `${style.tracking}em`,
                    lineHeight: style.leading,
                    textAlign: style.align,
                    color,
                    background: design.palette.bg,
                    // Solid bg covers the SVG text beneath while editing
                    caretColor: color,
                  }}
                />
              ) : (
                /* Transparent hit area — just a hover outline hint */
                <div
                  className="absolute inset-0 hover:outline hover:outline-1 hover:outline-neutral-400/40"
                  style={{ background: 'transparent' }}
                />
              )}
            </div>
          )
        }

        // Block slots — no interaction
        return null
      })}
    </div>
  )
}

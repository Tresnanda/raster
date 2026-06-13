// src/ui/ComposerRail.tsx
import { Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Check, Undo2, Redo2 } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { orderedSlots } from '../design/order'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import type { Slot } from '../types'

// ── Micro label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
      {children}
    </div>
  )
}

// ── Hairline divider ─────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-neutral-200 mx-4" />
}

// ── Slot type icon ───────────────────────────────────────────────────────────
function SlotTypeIcon({ slot }: { slot: Slot }) {
  if (slot.role === 'image') return <Image size={12} className="text-neutral-400 shrink-0" />
  if (slot.role === 'block') return <Square size={12} className="text-neutral-400 shrink-0" />
  if (slot.role === 'line') return <Minus size={12} className="text-neutral-400 shrink-0" />
  return <Type size={12} className="text-neutral-400 shrink-0" />
}

// ── Slot label ───────────────────────────────────────────────────────────────
function slotLabel(slot: Slot): string {
  if (slot.role === 'image') return 'Image'
  if (slot.role === 'block') return 'Shape'
  if (slot.role === 'line') return 'Line'
  // text role: show content snippet
  const content = slot.content?.trim()
  if (content) return content.length > 20 ? content.slice(0, 20) + '…' : content
  return slot.role
}

// ── Custom checkbox ───────────────────────────────────────────────────────────
function Checkbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        data-rail-checkbox={id}
      />
      <span
        aria-hidden="true"
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
          checked ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white',
        ].join(' ')}
      >
        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ComposerRail() {
  const design = useDesign(s => s.design)
  const selectedId = useDesign(s => s.selectedId)
  const selectElement = useDesign(s => s.selectElement)
  const addElement = useDesign(s => s.addElement)
  const deleteElement = useDesign(s => s.deleteElement)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  const setText = useDesign(s => s.setText)
  const setFill = useDesign(s => s.setFill)
  const snap = useDesign(s => s.snap)
  const setSnap = useDesign(s => s.setSnap)
  const undo = useDesign(s => s.undo)
  const redo = useDesign(s => s.redo)
  const canUndo = useDesign(s => s.past.length > 0)
  const canRedo = useDesign(s => s.future.length > 0)

  const canvas = canvasFor(design.format)
  const layers = [...orderedSlots(design)].reverse() // topmost first
  const selectedSlot = selectedId ? design.slots.find(s => s.id === selectedId) : null

  const resolvedBox = selectedSlot
    ? slotBox(canvas, design.grid, selectedSlot)
    : null

  const addBtnCls = [
    'flex flex-col items-center gap-1 rounded-md border border-neutral-200 py-2 px-1 text-neutral-600',
    'text-[11px] font-medium',
    'hover:border-neutral-400 hover:-translate-y-px hover:text-neutral-900',
    'active:scale-[0.97]',
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  ].join(' ')

  return (
    <aside
      className="w-[248px] shrink-0 border-l border-neutral-200 bg-white overflow-y-auto flex flex-col"
      aria-label="Composer"
    >
      {/* COMPOSE header + Undo/Redo */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-900">
          Compose
        </div>
        <div className="flex items-center gap-0.5">
          <button
            aria-label="Undo"
            title="Undo (Cmd+Z)"
            onClick={undo}
            disabled={!canUndo}
            data-undo-btn
            className={[
              'rounded p-1 transition-colors duration-100',
              canUndo
                ? 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                : 'text-neutral-300 cursor-not-allowed',
            ].join(' ')}
          >
            <Undo2 size={14} />
          </button>
          <button
            aria-label="Redo"
            title="Redo (Cmd+Shift+Z)"
            onClick={redo}
            disabled={!canRedo}
            data-redo-btn
            className={[
              'rounded p-1 transition-colors duration-100',
              canRedo
                ? 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                : 'text-neutral-300 cursor-not-allowed',
            ].join(' ')}
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      <Divider />

      {/* Add elements */}
      <SectionLabel>Add</SectionLabel>
      <div className="grid grid-cols-2 gap-1.5 px-4 pb-3">
        <button
          onClick={() => addElement('text')}
          className={addBtnCls}
          aria-label="Add text element"
          data-add-element="text"
        >
          <Type size={16} strokeWidth={1.5} />
          + Text
        </button>
        <button
          onClick={() => addElement('image')}
          className={addBtnCls}
          aria-label="Add image element"
          data-add-element="image"
        >
          <Image size={16} strokeWidth={1.5} />
          + Image
        </button>
        <button
          onClick={() => addElement('block')}
          className={addBtnCls}
          aria-label="Add shape element"
          data-add-element="block"
        >
          <Square size={16} strokeWidth={1.5} />
          + Shape
        </button>
        <button
          onClick={() => addElement('line')}
          className={addBtnCls}
          aria-label="Add line element"
          data-add-element="line"
        >
          <Minus size={16} strokeWidth={1.5} />
          + Line
        </button>
      </div>

      <Divider />

      {/* Layers list */}
      <SectionLabel>Layers</SectionLabel>
      <div className="flex flex-col pb-2" data-layers-list>
        {layers.length === 0 && (
          <div className="px-4 py-3 text-xs text-neutral-400">No layers yet.</div>
        )}
        {layers.map(slot => (
          <div
            key={slot.id}
            data-layer-row={slot.id}
            className={[
              'group relative flex items-center gap-2 px-4 py-2 cursor-pointer',
              'transition-colors duration-100',
              selectedId === slot.id
                ? 'bg-neutral-100 ring-1 ring-inset ring-neutral-900/10'
                : 'hover:bg-neutral-50',
            ].join(' ')}
            onClick={() => selectElement(slot.id)}
          >
            <SlotTypeIcon slot={slot} />
            <span className="flex-1 min-w-0 truncate text-xs text-neutral-700 tabular-nums">
              {slotLabel(slot)}
            </span>

            {/* Hover actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <button
                onClick={e => { e.stopPropagation(); bringForward(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Bring forward"
                title="Bring forward"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); sendBackward(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Send backward"
                title="Send backward"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); duplicateElement(slot.id) }}
                className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="Duplicate"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteElement(slot.id) }}
                className="rounded p-0.5 hover:bg-red-50 text-neutral-500 hover:text-red-600"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* Selected element mini-panel */}
      <SectionLabel>Selected</SectionLabel>
      <div className="px-4 pb-4">
        {!selectedSlot && (
          <p className="text-xs text-neutral-400 leading-relaxed">
            Select an element on the canvas to edit it.
          </p>
        )}

        {selectedSlot && (
          <div className="space-y-3">
            {/* Text-slot controls */}
            {selectedSlot.text && (
              <div className="space-y-2">
                {/* Align */}
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Align</div>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => setText(selectedSlot.id, { align: a })}
                        aria-label={`Align ${a}`}
                        className={[
                          'flex-1 flex items-center justify-center rounded border py-1.5',
                          'transition-colors duration-100',
                          selectedSlot.text?.align === a
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                        ].join(' ')}
                      >
                        {a === 'left' && <AlignLeft size={13} />}
                        {a === 'center' && <AlignCenter size={13} />}
                        {a === 'right' && <AlignRight size={13} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label
                    htmlFor="rail-text-size"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Size
                  </label>
                  <input
                    id="rail-text-size"
                    type="number"
                    min={10}
                    max={600}
                    value={selectedSlot.text.size}
                    onChange={e => setText(selectedSlot.id, { size: Number(e.target.value), fit: 'fixed' })}
                    className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm tabular-nums text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </div>
            )}

            {/* Block/Line fill */}
            {(selectedSlot.role === 'block' || selectedSlot.role === 'line') && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Fill</div>
                <div className="flex gap-1">
                  {(['accent', 'text'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFill(selectedSlot.id, f)}
                      className={[
                        'flex-1 rounded border py-1.5 text-xs font-medium capitalize',
                        'transition-colors duration-100',
                        selectedSlot.fill === f
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                      ].join(' ')}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Box readouts */}
            {resolvedBox && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Position</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['x', 'y', 'w', 'h'] as const).map(k => (
                    <div key={k} className="flex items-center gap-1 rounded border border-neutral-200 px-2 py-1">
                      <span className="text-[10px] font-semibold uppercase text-neutral-400 w-3 shrink-0">{k}</span>
                      <span className="text-xs tabular-nums text-neutral-700">{Math.round(resolvedBox[k])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Divider />
        {/* Snap to grid toggle */}
        <div className="px-4 py-3">
          <Checkbox
            id="rail-snap"
            label="Snap to grid"
            checked={snap}
            onChange={setSnap}
          />
        </div>
      </div>
    </aside>
  )
}

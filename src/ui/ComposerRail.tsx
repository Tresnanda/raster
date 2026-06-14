// src/ui/ComposerRail.tsx
import { Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Check, Undo2, Redo2, ImageIcon, X, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, FlipHorizontal2, FlipVertical2, List, ListOrdered, CaseUpper, CaseLower, CaseSensitive } from 'lucide-react'
import { useRef, useState } from 'react'
import { useDesign } from '../store/useDesign'
import { orderedSlots } from '../design/order'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { resolveTextStyle } from '../render/resolve-style'
import { ImageInput } from './ImageInput'
import type { FontFamily, ImageEffectKind, Slot } from '../types'
import type { ImageEffect } from '../types'
import { EFFECT_DEFAULTS } from '../lib/image-effects'

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

// ── NumberField ───────────────────────────────────────────────────────────────
function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={[
          'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
          'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
        ].join(' ')}
      />
    </div>
  )
}

// ── InspectorRow ──────────────────────────────────────────────────────────────
function InspectorRow({ label, children, overridden }: { label: string; children: React.ReactNode; overridden?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {label}
        </span>
        {overridden && (
          <span
            title="Overridden"
            className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0"
            aria-label="field overridden"
          />
        )}
      </div>
      {children}
    </div>
  )
}

// ── ImageFillControl ──────────────────────────────────────────────────────────
function ImageFillControl({
  slotId,
  imageFill,
  onSet,
  onClear,
}: {
  slotId: string
  imageFill: string | undefined
  onSet: (src: string) => void
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlValue, setUrlValue] = useState('')

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => onSet(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return
    onSet(trimmed)
    setUrlValue('')
  }

  const btnCls = [
    'flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700',
    'hover:border-neutral-400 hover:text-neutral-900 active:scale-[0.97]',
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  ].join(' ')

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        Image Fill
      </div>
      {imageFill ? (
        <div className="flex items-center gap-2" data-imagefill-set>
          <div
            className="h-7 w-10 shrink-0 rounded border border-neutral-200 bg-neutral-100 overflow-hidden"
            aria-label="Image fill preview"
          >
            <img src={imageFill} alt="" className="h-full w-full object-cover" />
          </div>
          <span className="flex-1 min-w-0 truncate text-[11px] text-neutral-500">Image set</span>
          <button
            onClick={onClear}
            aria-label="Remove image fill"
            className={[
              'rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40',
            ].join(' ')}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5" data-imagefill-unset>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Image fill file input for ${slotId}`}
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={btnCls}
            aria-label="Upload image fill"
          >
            <ImageIcon size={13} strokeWidth={1.5} />
            Image fill
          </button>
          <div className="flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-shadow duration-150">
            <ImageIcon size={12} className="shrink-0 text-neutral-400" strokeWidth={1.5} />
            <input
              type="url"
              placeholder="Paste image URL"
              value={urlValue}
              aria-label="Image fill URL"
              className="min-w-0 flex-1 bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
              onChange={e => setUrlValue(e.target.value)}
              onBlur={e => onUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onUrl((e.target as HTMLInputElement).value)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── ImageEffectsPanel ──────────────────────────────────────────────────────────
const EFFECT_CHIPS: { kind: ImageEffectKind; label: string }[] = [
  { kind: 'none',       label: 'None' },
  { kind: 'halftone',   label: 'Halftone' },
  { kind: 'duotone',   label: 'Duotone' },
  { kind: 'dither',    label: 'Dither' },
  { kind: 'posterize', label: 'Posterize' },
  { kind: 'threshold', label: 'Threshold' },
  { kind: 'invert',    label: 'Invert' },
  { kind: 'grayscale', label: 'B&W' },
]

function ImageEffectsPanel({
  slotId,
  effect,
  onSetEffect,
}: {
  slotId: string
  effect: ImageEffect | undefined
  onSetEffect: (slotId: string, effect: ImageEffect) => void
}) {
  const activeKind: ImageEffectKind = effect?.kind ?? 'none'
  const params = effect?.params ?? {}

  const chipCls = (active: boolean) => [
    'rounded border px-2 py-1 text-[11px] font-medium transition-colors duration-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
    'active:scale-[0.97]',
    active
      ? 'border-neutral-900 bg-neutral-900 text-white'
      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
  ].join(' ')

  const selectKind = (kind: ImageEffectKind) => {
    onSetEffect(slotId, { kind, params: { ...EFFECT_DEFAULTS[kind], ...params } })
  }

  const updateParam = (key: string, value: number | string) => {
    onSetEffect(slotId, {
      kind: activeKind,
      params: { ...params, [key]: value },
    })
  }

  return (
    <div className="space-y-2.5" data-effects-panel>
      {/* Kind chips -- 4-column grid */}
      <div className="grid grid-cols-4 gap-1">
        {EFFECT_CHIPS.map(({ kind, label }) => (
          <button
            key={kind}
            aria-label={label}
            onClick={() => selectKind(kind)}
            className={chipCls(activeKind === kind)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Param controls for the active kind */}
      {activeKind === 'halftone' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor={`ef-cell-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Cell size
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-cell-${slotId}`}
                aria-label="Cell"
                type="range"
                min={4}
                max={24}
                step={1}
                value={Number(params.cell ?? 8)}
                onChange={e => updateParam('cell', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.cell ?? 8)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`ef-angle-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Angle
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-angle-${slotId}`}
                aria-label="Angle"
                type="range"
                min={0}
                max={90}
                step={1}
                value={Number(params.angle ?? 45)}
                onChange={e => updateParam('angle', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.angle ?? 45)}&#xb0;
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-dark-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Dark
              </label>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-light-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Light
              </label>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'duotone' && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor={`ef-dark-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Dark
            </label>
            <input
              id={`ef-dark-${slotId}`}
              type="color"
              aria-label="Dark colour"
              value={String(params.dark ?? '#000000')}
              onChange={e => updateParam('dark', e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor={`ef-light-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Light
            </label>
            <input
              id={`ef-light-${slotId}`}
              type="color"
              aria-label="Light colour"
              value={String(params.light ?? '#ffffff')}
              onChange={e => updateParam('light', e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
            />
          </div>
        </div>
      )}

      {activeKind === 'dither' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor={`ef-scale-${slotId}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              Scale
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`ef-scale-${slotId}`}
                aria-label="Scale"
                type="range"
                min={1}
                max={4}
                step={1}
                value={Number(params.scale ?? 2)}
                onChange={e => updateParam('scale', Number(e.target.value))}
                className="flex-1 accent-neutral-900"
              />
              <span className="w-4 text-right text-[10px] tabular-nums text-neutral-500">
                {Number(params.scale ?? 2)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-dark-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Dark
              </label>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor={`ef-light-${slotId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Light
              </label>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'posterize' && (
        <div className="space-y-1">
          <label
            htmlFor={`ef-levels-${slotId}`}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            Levels
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`ef-levels-${slotId}`}
              aria-label="Levels"
              type="range"
              min={2}
              max={8}
              step={1}
              value={Number(params.levels ?? 4)}
              onChange={e => updateParam('levels', Number(e.target.value))}
              className="flex-1 accent-neutral-900"
            />
            <span className="w-4 text-right text-[10px] tabular-nums text-neutral-500">
              {Number(params.levels ?? 4)}
            </span>
          </div>
        </div>
      )}

      {activeKind === 'threshold' && (
        <div className="space-y-1">
          <label
            htmlFor={`ef-cutoff-${slotId}`}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            Cutoff
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`ef-cutoff-${slotId}`}
              aria-label="Cutoff"
              type="range"
              min={0}
              max={255}
              step={1}
              value={Number(params.cutoff ?? 128)}
              onChange={e => updateParam('cutoff', Number(e.target.value))}
              className="flex-1 accent-neutral-900"
            />
            <span className="w-6 text-right text-[10px] tabular-nums text-neutral-500">
              {Number(params.cutoff ?? 128)}
            </span>
          </div>
        </div>
      )}
    </div>
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
  const setBox = useDesign(s => s.setBox)
  const setContent = useDesign(s => s.setContent)
  const overrideText = useDesign(s => s.overrideText)
  const setColor = useDesign(s => s.setColor)
  const setBw = useDesign(s => s.setBw)
  const resetElement = useDesign(s => s.resetElement)
  const setImageFill = useDesign(s => s.setImageFill)
  const clearImageFill = useDesign(s => s.clearImageFill)
  const requestCrop = useDesign(s => s.requestCrop)
  const setOpacity = useDesign(s => s.setOpacity)
  const alignElement = useDesign(s => s.alignElement)
  const setRotation = useDesign(s => s.setRotation)
  const setFlip = useDesign(s => s.setFlip)
  const setRadius = useDesign(s => s.setRadius)
  const setStroke = useDesign(s => s.setStroke)
  const setStrokeWidth = useDesign(s => s.setStrokeWidth)
  const setShadow = useDesign(s => s.setShadow)
  const setBlend = useDesign(s => s.setBlend)
  const setImageEffect = useDesign(s => s.setImageEffect)
  const setTextTransform = useDesign(s => s.setTextTransform)
  const setIndent = useDesign(s => s.setIndent)
  const setListStyle = useDesign(s => s.setListStyle)
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
      className="w-[248px] shrink-0 min-h-0 overscroll-contain border-l border-neutral-200 bg-white overflow-y-auto flex flex-col"
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

      {/* Selected element inspector */}
      <SectionLabel>Properties</SectionLabel>
      <div className="px-4 pb-4">
        {!selectedSlot && (
          <p className="text-xs text-neutral-400 leading-relaxed">
            Select an element on the canvas to edit it.
          </p>
        )}

        {selectedSlot && (() => {
          const isText = selectedSlot.role !== 'image' && selectedSlot.role !== 'block' && selectedSlot.role !== 'line'
          const isImage = selectedSlot.role === 'image'
          const isShape = selectedSlot.role === 'block' || selectedSlot.role === 'line'
          const hasOverrides = !!(selectedSlot.overridden?.length || selectedSlot.color !== undefined || selectedSlot.bw !== undefined)
          const ov = selectedSlot.overridden ?? []
          const resolvedText = isText && selectedSlot.text
            ? resolveTextStyle(selectedSlot, design.typography)
            : null

          const typeLabel = isImage ? 'Image' : isShape ? (selectedSlot.role === 'line' ? 'Line' : 'Shape') : 'Text'

          const iconBtnCls = [
            'rounded p-1 text-neutral-500',
            'hover:bg-neutral-100 hover:text-neutral-900',
            'active:scale-[0.97] transition-transform duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          ].join(' ')

          return (
            <div className="space-y-3">
              {/* Header: type label + action buttons */}
              <div className="flex items-center gap-1">
                <span className="flex-1 text-xs font-semibold text-neutral-700">{typeLabel}</span>
                <button
                  onClick={() => duplicateElement(selectedSlot.id)}
                  className={iconBtnCls}
                  aria-label="Duplicate element"
                  title="Duplicate"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => bringForward(selectedSlot.id)}
                  className={iconBtnCls}
                  aria-label="Bring forward"
                  title="Bring forward"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => sendBackward(selectedSlot.id)}
                  className={iconBtnCls}
                  aria-label="Send backward"
                  title="Send backward"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  onClick={() => deleteElement(selectedSlot.id)}
                  className={[iconBtnCls, 'hover:bg-red-50 hover:text-red-600'].join(' ')}
                  aria-label="Delete element"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Reset to global — only when overrides present */}
              {hasOverrides && (
                <button
                  onClick={() => resetElement(selectedSlot.id)}
                  className={[
                    'w-full rounded border border-blue-200 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600',
                    'hover:bg-blue-50 active:scale-[0.97] transition-transform duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40',
                  ].join(' ')}
                >
                  Reset to global
                </button>
              )}

              {/* TEXT controls */}
              {isText && selectedSlot.text && (
                <div className="space-y-2.5">
                  {/* Content */}
                  <InspectorRow label="Content">
                    <textarea
                      aria-label="Content"
                      rows={2}
                      value={selectedSlot.content}
                      onChange={e => setContent(selectedSlot.id, e.target.value)}
                      className={[
                        'w-full rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-800 resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                  </InspectorRow>

                  {/* Typeface */}
                  <InspectorRow label="Typeface" overridden={ov.includes('family')}>
                    <select
                      id={`insp-typeface-${selectedSlot.id}`}
                      aria-label="Typeface"
                      value={resolvedText!.family}
                      onChange={e => overrideText(selectedSlot.id, { family: e.target.value as FontFamily })}
                      className={[
                        'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    >
                      <option value="display">Archivo Display</option>
                      <option value="sans">Inter</option>
                      <option value="condensed">Archivo Narrow</option>
                      <option value="mono">Space Mono</option>
                    </select>
                  </InspectorRow>

                  {/* Size */}
                  <InspectorRow label="Size" overridden={ov.includes('size')}>
                    <input
                      id={`insp-size-${selectedSlot.id}`}
                      aria-label="Size"
                      type="number"
                      min={10}
                      max={600}
                      value={resolvedText!.size}
                      onChange={e => overrideText(selectedSlot.id, { size: Number(e.target.value), fit: 'fixed' })}
                      className={[
                        'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                  </InspectorRow>

                  {/* Weight */}
                  <InspectorRow label="Weight">
                    <select
                      id={`insp-weight-${selectedSlot.id}`}
                      aria-label="Weight"
                      value={selectedSlot.text.weight}
                      onChange={e => setText(selectedSlot.id, { weight: Number(e.target.value) })}
                      className={[
                        'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    >
                      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </InspectorRow>

                  {/* Tracking */}
                  <InspectorRow label="Tracking" overridden={ov.includes('tracking')}>
                    <input
                      id={`insp-tracking-${selectedSlot.id}`}
                      aria-label="Tracking"
                      type="number"
                      step={0.005}
                      value={resolvedText!.tracking}
                      onChange={e => overrideText(selectedSlot.id, { tracking: Number(e.target.value) })}
                      className={[
                        'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                  </InspectorRow>

                  {/* Leading */}
                  <InspectorRow label="Leading" overridden={ov.includes('leading')}>
                    <input
                      id={`insp-leading-${selectedSlot.id}`}
                      aria-label="Leading"
                      type="number"
                      step={0.01}
                      value={resolvedText!.leading}
                      onChange={e => overrideText(selectedSlot.id, { leading: Number(e.target.value) })}
                      className={[
                        'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                  </InspectorRow>

                  {/* Align */}
                  <InspectorRow label="Align">
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
                  </InspectorRow>

                  {/* Fit */}
                  <InspectorRow label="Fit" overridden={ov.includes('fit')}>
                    <div className="flex gap-1">
                      {(['auto', 'fixed'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setText(selectedSlot.id, { fit: f })}
                          className={[
                            'flex-1 rounded border py-1.5 text-xs font-medium capitalize',
                            'transition-colors duration-100',
                            selectedSlot.text?.fit === f
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                          ].join(' ')}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </InspectorRow>

                  {/* Colour */}
                  <InspectorRow label="Colour" overridden={selectedSlot.color !== undefined}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Element colour"
                        value={selectedSlot.color ?? design.palette.text}
                        onChange={e => setColor(selectedSlot.id, e.target.value)}
                        className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
                      />
                      {!selectedSlot.color && (
                        <span className="text-[10px] text-neutral-400">using global</span>
                      )}
                    </div>
                  </InspectorRow>

                  {/* Image Fill */}
                  <ImageFillControl
                    slotId={selectedSlot.id}
                    imageFill={selectedSlot.imageFill}
                    onSet={src => setImageFill(selectedSlot.id, src)}
                    onClear={() => clearImageFill(selectedSlot.id)}
                  />

                  {/* Case / transform */}
                  <InspectorRow label="Case">
                    <div className="flex gap-1" data-case-controls>
                      {([
                        { value: 'none',  label: 'Aa', icon: <CaseSensitive size={13} />, title: 'None' },
                        { value: 'upper', label: 'AA', icon: <CaseUpper size={13} />,    title: 'UPPER' },
                        { value: 'lower', label: 'aa', icon: <CaseLower size={13} />,    title: 'lower' },
                        { value: 'title', label: 'Tt', icon: <Type size={13} />,         title: 'Title' },
                      ] as const).map(({ value, icon, title }) => (
                        <button
                          key={value}
                          onClick={() => setTextTransform(selectedSlot.id, value)}
                          aria-label={`Case ${title}`}
                          title={title}
                          data-case={value}
                          className={[
                            'flex-1 flex items-center justify-center rounded border py-1.5',
                            'transition-colors duration-100',
                            (selectedSlot.textTransform ?? 'none') === value
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                          ].join(' ')}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </InspectorRow>

                  {/* List style */}
                  <InspectorRow label="List">
                    <div className="flex gap-1" data-list-controls>
                      {([
                        { value: 'none',   label: 'None',     icon: null },
                        { value: 'bullet', label: 'Bullet',   icon: <List size={13} /> },
                        { value: 'number', label: 'Numbered', icon: <ListOrdered size={13} /> },
                      ] as const).map(({ value, label, icon }) => (
                        <button
                          key={value}
                          onClick={() => setListStyle(selectedSlot.id, value)}
                          aria-label={label}
                          title={label}
                          data-liststyle={value}
                          className={[
                            'flex-1 flex items-center justify-center gap-1 rounded border py-1.5 text-[11px] font-medium',
                            'transition-colors duration-100',
                            (selectedSlot.listStyle ?? 'none') === value
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                          ].join(' ')}
                        >
                          {icon ?? label}
                        </button>
                      ))}
                    </div>
                  </InspectorRow>

                  {/* Hanging indent */}
                  <InspectorRow label="Indent">
                    <input
                      id={`insp-indent-${selectedSlot.id}`}
                      aria-label="Hanging indent"
                      type="number"
                      min={0}
                      max={200}
                      step={1}
                      value={selectedSlot.indent ?? 0}
                      onChange={e => setIndent(selectedSlot.id, Number(e.target.value))}
                      className={[
                        'w-full rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                  </InspectorRow>
                </div>
              )}

              {/* IMAGE controls */}
              {isImage && (
                <div className="space-y-2.5">
                  {/* Upload / replace via the real uploader (file pick + URL → crop) */}
                  <ImageInput slotId={selectedSlot.id} />

                  {/* Re-crop only makes sense once an image is present */}
                  {selectedSlot.content && (
                    <button
                      onClick={() => requestCrop(selectedSlot.id, selectedSlot.content)}
                      className={[
                        'w-full rounded border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700',
                        'hover:border-neutral-400 active:scale-[0.97] transition-transform duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                      ].join(' ')}
                    >
                      Re-crop current image
                    </button>
                  )}

                  {/* B&W */}
                  <InspectorRow label="Black & white" overridden={selectedSlot.bw !== undefined}>
                    <Checkbox
                      id={`insp-bw-${selectedSlot.id}`}
                      label="Black & white"
                      checked={selectedSlot.bw ?? design.style.bwImage}
                      onChange={v => setBw(selectedSlot.id, v)}
                    />
                  </InspectorRow>

                  {/* EFFECTS */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      Effects
                    </div>
                    <ImageEffectsPanel
                      slotId={selectedSlot.id}
                      effect={selectedSlot.imageEffect}
                      onSetEffect={setImageEffect}
                    />
                  </div>
                </div>
              )}

              {/* SHAPE / LINE controls */}
              {isShape && (
                <div className="space-y-2.5">
                  <InspectorRow label="Fill">
                    <div className="flex gap-1 flex-wrap">
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
                      {/* Custom colour */}
                      <input
                        type="color"
                        aria-label="Custom fill colour"
                        value={
                          !['accent', 'text'].includes(selectedSlot.fill ?? '')
                            ? (selectedSlot.fill ?? design.palette.accent)
                            : design.palette.accent
                        }
                        onChange={e => setFill(selectedSlot.id, e.target.value)}
                        title="Custom colour"
                        className="h-8 w-8 cursor-pointer rounded border border-neutral-200 p-0.5"
                      />
                    </div>
                  </InspectorRow>
                </div>
              )}

              {/* Position & Size */}
              {resolvedBox && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    Position & Size
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberField
                      id={`insp-x-${selectedSlot.id}`}
                      label="X position"
                      value={Math.round(resolvedBox.x)}
                      onChange={v => setBox(selectedSlot.id, { ...resolvedBox, x: v })}
                    />
                    <NumberField
                      id={`insp-y-${selectedSlot.id}`}
                      label="Y position"
                      value={Math.round(resolvedBox.y)}
                      onChange={v => setBox(selectedSlot.id, { ...resolvedBox, y: v })}
                    />
                    <NumberField
                      id={`insp-w-${selectedSlot.id}`}
                      label="Width"
                      value={Math.round(resolvedBox.w)}
                      min={1}
                      onChange={v => setBox(selectedSlot.id, { ...resolvedBox, w: v })}
                    />
                    <NumberField
                      id={`insp-h-${selectedSlot.id}`}
                      label="Height"
                      value={Math.round(resolvedBox.h)}
                      min={1}
                      onChange={v => setBox(selectedSlot.id, { ...resolvedBox, h: v })}
                    />
                  </div>
                </div>
              )}

              {/* OPACITY */}
              {resolvedBox && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      Opacity
                    </span>
                    <span className="text-[10px] tabular-nums text-neutral-500 font-medium">
                      {Math.round((selectedSlot.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Opacity"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((selectedSlot.opacity ?? 1) * 100)}
                    onChange={e => setOpacity(selectedSlot.id, Number(e.target.value) / 100)}
                    className="w-full accent-neutral-900"
                  />
                </div>
              )}

              {/* ALIGN */}
              {resolvedBox && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    Align
                  </div>
                  <div className="flex gap-1">
                    {[
                      { edge: 'left' as const,    label: 'Canvas align left',              Icon: AlignStartVertical },
                      { edge: 'centerH' as const, label: 'Canvas align center horizontal', Icon: AlignCenterVertical },
                      { edge: 'right' as const,   label: 'Canvas align right',             Icon: AlignEndVertical },
                      { edge: 'top' as const,     label: 'Canvas align top',               Icon: AlignStartHorizontal },
                      { edge: 'centerV' as const, label: 'Canvas align center vertical',   Icon: AlignCenterHorizontal },
                      { edge: 'bottom' as const,  label: 'Canvas align bottom',            Icon: AlignEndHorizontal },
                    ].map(({ edge, label, Icon }) => (
                      <button
                        key={edge}
                        aria-label={label}
                        onClick={() => alignElement(selectedSlot.id, edge)}
                        className={[
                          'flex-1 flex items-center justify-center rounded border border-neutral-200 py-1.5',
                          'text-neutral-500 hover:border-neutral-400 hover:text-neutral-900',
                          'active:scale-[0.97] transition-transform duration-150',
                          '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                        ].join(' ')}
                      >
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TRANSFORM */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Transform
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <label
                    htmlFor={`insp-rotation-${selectedSlot.id}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Rotation
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`insp-rotation-${selectedSlot.id}`}
                      aria-label="Rotation"
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedSlot.rotation ?? 0}
                      onChange={e => setRotation(selectedSlot.id, Number(e.target.value))}
                      className={[
                        'w-20 rounded border border-neutral-200 px-2 py-1 text-xs tabular-nums text-neutral-800',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                      ].join(' ')}
                    />
                    <span className="text-[11px] text-neutral-400">°</span>
                    <input
                      type="range"
                      aria-label="Rotation slider"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedSlot.rotation ?? 0}
                      onChange={e => setRotation(selectedSlot.id, Number(e.target.value))}
                      className="flex-1 accent-neutral-900"
                    />
                  </div>
                </div>

                {/* Flip */}
                <div className="flex gap-1">
                  <button
                    aria-label="Flip horizontal"
                    onClick={() => setFlip(selectedSlot.id, 'H', !selectedSlot.flipH)}
                    title="Flip horizontal"
                    className={[
                      'flex flex-1 items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium',
                      'active:scale-[0.97] transition-transform duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                      selectedSlot.flipH
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    <FlipHorizontal2 size={13} />
                    H
                  </button>
                  <button
                    aria-label="Flip vertical"
                    onClick={() => setFlip(selectedSlot.id, 'V', !selectedSlot.flipV)}
                    title="Flip vertical"
                    className={[
                      'flex flex-1 items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium',
                      'active:scale-[0.97] transition-transform duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                      selectedSlot.flipV
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    <FlipVertical2 size={13} />
                    V
                  </button>
                </div>

                {/* Blend */}
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={`insp-blend-${selectedSlot.id}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    Blend
                  </label>
                  <select
                    id={`insp-blend-${selectedSlot.id}`}
                    aria-label="Blend mode"
                    value={selectedSlot.blend ?? 'normal'}
                    onChange={e => setBlend(selectedSlot.id, e.target.value)}
                    className={[
                      'w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800',
                      'focus:outline-none focus:ring-2 focus:ring-neutral-900/10',
                    ].join(' ')}
                  >
                    {[
                      'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                      'difference', 'exclusion', 'soft-light', 'hard-light',
                    ].map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                {/* Shadow */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      Shadow
                    </span>
                    <button
                      aria-label="Toggle shadow"
                      onClick={() => {
                        if (selectedSlot.shadow) {
                          setShadow(selectedSlot.id, null)
                        } else {
                          setShadow(selectedSlot.id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
                        }
                      }}
                      className={[
                        'h-5 w-9 rounded-full border transition-colors duration-150',
                        selectedSlot.shadow
                          ? 'border-neutral-900 bg-neutral-900'
                          : 'border-neutral-300 bg-neutral-100',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150',
                          'mx-auto',
                          selectedSlot.shadow ? 'translate-x-1.5' : '-translate-x-1.5',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                  {selectedSlot.shadow && (
                    <div className="grid grid-cols-3 gap-1">
                      <NumberField
                        id={`insp-shadow-dx-${selectedSlot.id}`}
                        label="X"
                        value={selectedSlot.shadow.dx}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dx: v })}
                      />
                      <NumberField
                        id={`insp-shadow-dy-${selectedSlot.id}`}
                        label="Y"
                        value={selectedSlot.shadow.dy}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dy: v })}
                      />
                      <NumberField
                        id={`insp-shadow-blur-${selectedSlot.id}`}
                        label="Blur"
                        value={selectedSlot.shadow.blur}
                        min={0}
                        onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, blur: v })}
                      />
                      <div className="col-span-3 flex flex-col gap-0.5">
                        <label
                          htmlFor={`insp-shadow-color-${selectedSlot.id}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                        >
                          Color
                        </label>
                        <input
                          id={`insp-shadow-color-${selectedSlot.id}`}
                          type="color"
                          aria-label="Shadow colour"
                          value={selectedSlot.shadow.color}
                          onChange={e => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, color: e.target.value })}
                          className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Corner radius + stroke — block and image only */}
                {(isShape || isImage) && (
                  <div className="space-y-2">
                    <NumberField
                      id={`insp-radius-${selectedSlot.id}`}
                      label="Corner radius"
                      value={selectedSlot.radius ?? 0}
                      min={0}
                      onChange={v => setRadius(selectedSlot.id, v)}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <label
                          htmlFor={`insp-stroke-${selectedSlot.id}`}
                          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                        >
                          Stroke
                        </label>
                        <input
                          id={`insp-stroke-${selectedSlot.id}`}
                          type="color"
                          aria-label="Stroke colour"
                          value={
                            selectedSlot.stroke && !['accent','text'].includes(selectedSlot.stroke)
                              ? selectedSlot.stroke
                              : design.palette.accent
                          }
                          onChange={e => setStroke(selectedSlot.id, e.target.value)}
                          className="h-7 w-full cursor-pointer rounded border border-neutral-200 p-0.5"
                        />
                      </div>
                      <NumberField
                        id={`insp-strokewidth-${selectedSlot.id}`}
                        label="Stroke width"
                        value={selectedSlot.strokeWidth ?? 0}
                        min={0}
                        onChange={v => setStrokeWidth(selectedSlot.id, v)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
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

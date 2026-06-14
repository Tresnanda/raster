// src/ui/ComposerRail.tsx — Element inspector pane, fully restructured
import {
  Type, Image, Square, Minus, ChevronUp, ChevronDown, Copy, Trash2,
  Eye, EyeOff, Lock, LockOpen,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, ImageIcon, X,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  FlipHorizontal2, FlipVertical2,
  List, ListOrdered, CaseUpper, CaseLower, CaseSensitive,
  MousePointer2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDesign } from '../store/useDesign'
import { orderedSlots } from '../design/order'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'
import { resolveTextStyle } from '../render/resolve-style'
import { ImageInput } from './ImageInput'
import { Checkbox } from './controls/Checkbox'
import { NumberField as NumberInput } from './controls/NumberField'
import { Slider } from './controls/Slider'
import { Switch } from '../components/ui/switch'
import { Select } from './controls/Select'
import { Section } from './controls/Section'
import type { FontFamily, ImageEffectKind, Slot } from '../types'
import type { ImageEffect } from '../types'
import { EFFECT_DEFAULTS } from '../lib/image-effects'

// ── Micro label ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
      {children}
    </div>
  )
}

// ── Slot type icon ───────────────────────────────────────────────────────────
function SlotTypeIcon({ slot }: { slot: Slot }) {
  if (slot.role === 'image') return <Image size={11} className="text-muted-foreground shrink-0" strokeWidth={2.5} />
  if (slot.role === 'block') return <Square size={11} className="text-muted-foreground shrink-0" strokeWidth={2.5} />
  if (slot.role === 'line') return <Minus size={11} className="text-muted-foreground shrink-0" strokeWidth={2.5} />
  return <Type size={11} className="text-muted-foreground shrink-0" strokeWidth={2.5} />
}

// ── Slot label ───────────────────────────────────────────────────────────────
function slotLabel(slot: Slot): string {
  if (slot.name?.trim()) return slot.name.trim()
  if (slot.role === 'image') return 'Image'
  if (slot.role === 'block') return 'Shape'
  if (slot.role === 'line') return 'Line'
  const content = slot.content?.trim()
  if (content) return content.length > 20 ? content.slice(0, 20) + '…' : content
  return slot.role
}

// ── Layers list (visibility / lock / rename / dup / delete / z-order) ──────────
function LayersList() {
  const design = useDesign(s => s.design)
  const selectedId = useDesign(s => s.selectedId)
  const selectElement = useDesign(s => s.selectElement)
  const toggleHidden = useDesign(s => s.toggleHidden)
  const toggleLocked = useDesign(s => s.toggleLocked)
  const renameSlot = useDesign(s => s.renameSlot)
  const duplicateElement = useDesign(s => s.duplicateElement)
  const deleteElement = useDesign(s => s.deleteElement)
  const bringForward = useDesign(s => s.bringForward)
  const sendBackward = useDesign(s => s.sendBackward)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const layers = [...orderedSlots(design)].reverse() // topmost first

  if (layers.length === 0) {
    return <div className="px-4 py-3 font-sans text-[10px] text-muted-foreground">No layers yet.</div>
  }

  const iconBtn = 'rounded-sm p-0.5 text-muted-foreground hover:bg-foreground hover:text-background transition-colors duration-100'

  return (
    <div className="flex flex-col" data-layers-list>
      {layers.map(slot => {
        const isSel = selectedId === slot.id
        const isRenaming = renaming === slot.id
        const commit = () => { renameSlot(slot.id, draft); setRenaming(null) }
        return (
          <div
            key={slot.id}
            data-layer-row={slot.id}
            className={cn(
              'group relative flex items-center gap-1.5 px-4 py-1.5 cursor-pointer transition-colors duration-100',
              isSel ? 'bg-muted' : 'hover:bg-muted',
              slot.hidden && 'opacity-50',
            )}
            onClick={() => selectElement(slot.id)}
          >
            {/* Visibility */}
            <button
              onClick={e => { e.stopPropagation(); toggleHidden(slot.id) }}
              className={iconBtn} aria-label={slot.hidden ? 'Show layer' : 'Hide layer'}
            >
              {slot.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <SlotTypeIcon slot={slot} />
            {isRenaming ? (
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setRenaming(null) }}
                onClick={e => e.stopPropagation()}
                className="flex-1 min-w-0 bg-background border border-foreground rounded-sm px-1 font-sans text-[10px] text-foreground outline-none"
              />
            ) : (
              <span
                className={cn('flex-1 min-w-0 truncate font-sans text-[10px]', slot.locked ? 'text-muted-foreground italic' : 'text-foreground')}
                onDoubleClick={e => { e.stopPropagation(); setDraft(slot.name ?? slotLabel(slot)); setRenaming(slot.id) }}
                title="Double-click to rename"
              >
                {slotLabel(slot)}
              </span>
            )}
            {/* Lock — always visible when locked, else on hover */}
            <button
              onClick={e => { e.stopPropagation(); toggleLocked(slot.id) }}
              className={cn(iconBtn, slot.locked ? 'opacity-100 text-amber-600' : 'opacity-0 group-hover:opacity-100')}
              aria-label={slot.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {slot.locked ? <Lock size={11} /> : <LockOpen size={11} />}
            </button>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <button onClick={e => { e.stopPropagation(); bringForward(slot.id) }} className={iconBtn} aria-label="Bring forward"><ChevronUp size={11} /></button>
              <button onClick={e => { e.stopPropagation(); sendBackward(slot.id) }} className={iconBtn} aria-label="Send backward"><ChevronDown size={11} /></button>
              <button onClick={e => { e.stopPropagation(); duplicateElement(slot.id) }} className={iconBtn} aria-label="Duplicate"><Copy size={11} /></button>
              <button onClick={e => { e.stopPropagation(); deleteElement(slot.id) }} className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-background transition-colors duration-100" aria-label="Delete"><Trash2 size={11} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── InspectorRow ──────────────────────────────────────────────────────────────
function InspectorRow({ label, children, overridden }: { label: string; children: React.ReactNode; overridden?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {overridden && (
          <span
            title="Overridden"
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent shrink-0"
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
    'flex items-center gap-1.5 rounded-md border-2 border-foreground px-2.5 py-1.5',
    'font-sans text-[10px] font-medium text-foreground',
    'shadow-brutal hover:-translate-y-px active:translate-y-px active:translate-x-px active:shadow-none',
    'transition-transform duration-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
  ].join(' ')

  return (
    <div className="space-y-1.5">
      <FieldLabel>Image Fill</FieldLabel>
      {imageFill ? (
        <div className="flex items-center gap-2" data-imagefill-set>
          <div
            className="h-7 w-10 shrink-0 rounded-md border-2 border-foreground overflow-hidden"
            aria-label="Image fill preview"
          >
            <img src={imageFill} alt="" className="h-full w-full object-cover" />
          </div>
          <span className="flex-1 min-w-0 truncate font-sans text-[10px] text-muted-foreground">Image set</span>
          <button
            onClick={onClear}
            aria-label="Remove image fill"
            className={[
              'rounded-none p-1 text-muted-foreground hover:text-accent hover:bg-accent/10',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
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
          <div className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 focus-within:border-2 focus-within:border-foreground transition-colors duration-100">
            <ImageIcon size={12} className="shrink-0 text-muted-foreground" strokeWidth={2} />
            <input
              type="url"
              placeholder="Paste image URL"
              value={urlValue}
              aria-label="Image fill URL"
              className="min-w-0 flex-1 bg-transparent font-sans text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none"
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
// Note: grayscale ('B&W') is intentionally omitted here — the "Black & white"
// toggle above covers it, so the effect chips stay the distinct print treatments.
const EFFECT_CHIPS: { kind: ImageEffectKind; label: string }[] = [
  { kind: 'none',       label: 'None' },
  { kind: 'halftone',   label: 'Halftone' },
  { kind: 'duotone',   label: 'Duotone' },
  { kind: 'dither',    label: 'Dither' },
  { kind: 'posterize', label: 'Posterize' },
  { kind: 'threshold', label: 'Threshold' },
  { kind: 'invert',    label: 'Invert' },
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
    'rounded-md border-2 border-foreground px-2 py-1',
    'font-sans text-[9px] font-medium',
    'transition-colors duration-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    active
      ? 'bg-foreground text-background border-foreground'
      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
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

      {activeKind === 'halftone' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <FieldLabel>Cell size</FieldLabel>
            <div className="flex items-center gap-2">
              <Slider
                aria-label="Cell"
                min={4}
                max={24}
                step={1}
                value={Number(params.cell ?? 8)}
                onChange={v => updateParam('cell', v)}
                className="flex-1"
              />
              <span className="w-6 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                {Number(params.cell ?? 8)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <FieldLabel>Angle</FieldLabel>
            <div className="flex items-center gap-2">
              <Slider
                aria-label="Angle"
                min={0}
                max={90}
                step={1}
                value={Number(params.angle ?? 45)}
                onChange={v => updateParam('angle', v)}
                className="flex-1"
              />
              <span className="w-6 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                {Number(params.angle ?? 45)}&#xb0;
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel>Dark</FieldLabel>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded-md border-2 border-foreground p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <FieldLabel>Light</FieldLabel>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded-md border-2 border-foreground p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'duotone' && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex flex-col gap-0.5">
            <FieldLabel>Dark</FieldLabel>
            <input
              id={`ef-dark-${slotId}`}
              type="color"
              aria-label="Dark colour"
              value={String(params.dark ?? '#000000')}
              onChange={e => updateParam('dark', e.target.value)}
              className="h-7 w-full cursor-pointer rounded-none border-2 border-foreground p-0.5"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <FieldLabel>Light</FieldLabel>
            <input
              id={`ef-light-${slotId}`}
              type="color"
              aria-label="Light colour"
              value={String(params.light ?? '#ffffff')}
              onChange={e => updateParam('light', e.target.value)}
              className="h-7 w-full cursor-pointer rounded-none border-2 border-foreground p-0.5"
            />
          </div>
        </div>
      )}

      {activeKind === 'dither' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <FieldLabel>Scale</FieldLabel>
            <div className="flex items-center gap-2">
              <Slider
                aria-label="Scale"
                min={1}
                max={4}
                step={1}
                value={Number(params.scale ?? 2)}
                onChange={v => updateParam('scale', v)}
                className="flex-1"
              />
              <span className="w-4 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                {Number(params.scale ?? 2)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <FieldLabel>Dark</FieldLabel>
              <input
                id={`ef-dark-${slotId}`}
                type="color"
                aria-label="Dark colour"
                value={String(params.dark ?? '#000000')}
                onChange={e => updateParam('dark', e.target.value)}
                className="h-7 w-full cursor-pointer rounded-md border-2 border-foreground p-0.5"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <FieldLabel>Light</FieldLabel>
              <input
                id={`ef-light-${slotId}`}
                type="color"
                aria-label="Light colour"
                value={String(params.light ?? '#ffffff')}
                onChange={e => updateParam('light', e.target.value)}
                className="h-7 w-full cursor-pointer rounded-md border-2 border-foreground p-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {activeKind === 'posterize' && (
        <div className="space-y-1">
          <FieldLabel>Levels</FieldLabel>
          <div className="flex items-center gap-2">
            <Slider
              aria-label="Levels"
              min={2}
              max={8}
              step={1}
              value={Number(params.levels ?? 4)}
              onChange={v => updateParam('levels', v)}
              className="flex-1"
            />
            <span className="w-4 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
              {Number(params.levels ?? 4)}
            </span>
          </div>
        </div>
      )}

      {activeKind === 'threshold' && (
        <div className="space-y-1">
          <FieldLabel>Cutoff</FieldLabel>
          <div className="flex items-center gap-2">
            <Slider
              aria-label="Cutoff"
              min={0}
              max={255}
              step={1}
              value={Number(params.cutoff ?? 128)}
              onChange={v => updateParam('cutoff', v)}
              className="flex-1"
            />
            <span className="w-6 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
              {Number(params.cutoff ?? 128)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FONT FAMILY options ───────────────────────────────────────────────────────
const TYPEFACE_OPTIONS = [
  { value: 'display',   label: 'Archivo Display' },
  { value: 'sans',      label: 'Inter' },
  { value: 'condensed', label: 'Archivo Narrow' },
  { value: 'mono',      label: 'Space Mono' },
]

const WEIGHT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => ({
  value: String(w),
  label: String(w),
}))

const BLEND_OPTIONS = [
  'normal', 'multiply', 'screen', 'overlay', 'darken',
  'lighten', 'difference', 'exclusion', 'soft-light', 'hard-light',
].map(m => ({ value: m, label: m }))

// ── Add button ────────────────────────────────────────────────────────────────
const addBtnCls = [
  'flex flex-col items-center gap-1 py-2 px-1',
  'font-sans text-[9px] font-medium text-muted-foreground',
  'hover:bg-muted hover:text-foreground',
  'transition-colors duration-100',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
].join(' ')

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
  const selectedIds = useDesign(s => s.selectedIds)
  const alignSelection = useDesign(s => s.alignSelection)
  const distributeSelection = useDesign(s => s.distributeSelection)
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
  const selectedSlot = selectedId ? design.slots.find(s => s.id === selectedId) : null

  const resolvedBox = selectedSlot
    ? slotBox(canvas, design.grid, selectedSlot)
    : null

  const iconBtnCls = [
    'rounded-md p-1 text-muted-foreground',
    'hover:bg-muted hover:text-foreground',
    'transition-colors duration-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
  ].join(' ')

  return (
    <aside
      className="w-[268px] shrink-0 min-h-0 overscroll-contain border-l border-border/50 bg-background overflow-y-auto flex flex-col"
      aria-label="Element"
    >
      {/* Properties masthead */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/40">
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Properties
        </div>
        <div className="flex items-center gap-0">
          <button
            aria-label="Undo"
            title="Undo (Cmd+Z)"
            onClick={undo}
            disabled={!canUndo}
            data-undo-btn
            className={[
              'rounded-md p-1.5 transition-colors duration-100',
              canUndo
                ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                : 'text-muted-foreground/30 cursor-not-allowed',
            ].join(' ')}
          >
            <Undo2 size={12} strokeWidth={2.5} />
          </button>
          <button
            aria-label="Redo"
            title="Redo (Cmd+Shift+Z)"
            onClick={redo}
            disabled={!canRedo}
            data-redo-btn
            className={[
              'rounded-md p-1.5 transition-colors duration-100',
              canRedo
                ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                : 'text-muted-foreground/30 cursor-not-allowed',
            ].join(' ')}
          >
            <Redo2 size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Compact Add row — always visible */}
      <div className="grid grid-cols-4 gap-0 border-b border-border/40">
        <button onClick={() => addElement('text')} className={addBtnCls} aria-label="Add text element" data-add-element="text">
          <Type size={14} strokeWidth={1.5} />
          <span className="text-[10px]">Text</span>
        </button>
        <button onClick={() => addElement('image')} className={addBtnCls} aria-label="Add image element" data-add-element="image">
          <Image size={14} strokeWidth={1.5} />
          <span className="text-[10px]">Image</span>
        </button>
        <button onClick={() => addElement('block')} className={addBtnCls} aria-label="Add shape element" data-add-element="block">
          <Square size={14} strokeWidth={1.5} />
          <span className="text-[10px]">Shape</span>
        </button>
        <button onClick={() => addElement('line')} className={addBtnCls} aria-label="Add line element" data-add-element="line">
          <Minus size={14} strokeWidth={1.5} />
          <span className="text-[10px]">Line</span>
        </button>
      </div>

      {/* ── EMPTY STATE ───────────────────────────────────────────────────────── */}
      {!selectedSlot && (
        <div className="flex-1 flex flex-col">
          {/* Empty state */}
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center border-b border-border/40">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-foreground bg-muted">
              <MousePointer2 size={16} className="text-muted-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-sans text-[11px] font-semibold text-foreground">No selection</p>
              <p className="mt-1 font-sans text-[10px] text-muted-foreground leading-relaxed">
                Select an element on canvas
              </p>
            </div>
          </div>

          {/* Layers in empty state */}
          <div className="px-4 pt-3">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Layers
            </div>
          </div>
          <div className="pb-2"><LayersList /></div>
        </div>
      )}

      {/* ── MULTI-SELECT PANEL ────────────────────────────────────────────────── */}
      {selectedIds.length > 1 && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-4 pt-3 pb-2 border-b border-border/40 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {selectedIds.length} selected
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Align</div>
              <div className="grid grid-cols-6 gap-1">
                {([
                  ['left', AlignStartVertical], ['centerH', AlignCenterVertical], ['right', AlignEndVertical],
                  ['top', AlignStartHorizontal], ['centerV', AlignCenterHorizontal], ['bottom', AlignEndHorizontal],
                ] as const).map(([edge, Icon]) => (
                  <button
                    key={edge}
                    onClick={() => alignSelection(edge)}
                    aria-label={`Align ${edge}`}
                    className="flex items-center justify-center rounded-md border-2 border-foreground bg-card py-1.5 text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)] active:scale-[0.97] transition-[transform,box-shadow] duration-100"
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            </div>
            {selectedIds.length >= 3 && (
              <div>
                <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Distribute</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => distributeSelection('h')} aria-label="Distribute horizontally" className="flex items-center justify-center gap-1.5 rounded-md border-2 border-foreground bg-card py-1.5 text-[11px] font-medium text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)] active:scale-[0.97] transition-[transform,box-shadow] duration-100">
                    <AlignHorizontalDistributeCenter size={13} /> Horizontal
                  </button>
                  <button onClick={() => distributeSelection('v')} aria-label="Distribute vertically" className="flex items-center justify-center gap-1.5 rounded-md border-2 border-foreground bg-card py-1.5 text-[11px] font-medium text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)] active:scale-[0.97] transition-[transform,box-shadow] duration-100">
                    <AlignVerticalDistributeCenter size={13} /> Vertical
                  </button>
                </div>
              </div>
            )}
            <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
              Align snaps to the selection's bounds. Shift-click to add/remove; drag a box on empty canvas to marquee-select.
            </p>
          </div>
          <div className="px-4 pt-1 border-t border-border/40">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2 mt-2">Layers</div>
          </div>
          <div className="pb-2"><LayersList /></div>
        </div>
      )}

      {/* ── SELECTED ELEMENT INSPECTOR ────────────────────────────────────────── */}
      {selectedSlot && selectedIds.length <= 1 && (() => {
        const isText = selectedSlot.role !== 'image' && selectedSlot.role !== 'block' && selectedSlot.role !== 'line'
        const isImage = selectedSlot.role === 'image'
        const isShape = selectedSlot.role === 'block' || selectedSlot.role === 'line'
        const hasOverrides = !!(selectedSlot.overridden?.length || selectedSlot.color !== undefined || selectedSlot.bw !== undefined)
        const ov = selectedSlot.overridden ?? []
        const resolvedText = isText && selectedSlot.text
          ? resolveTextStyle(selectedSlot, design.typography)
          : null

        const typeLabel = isImage ? 'Image' : isShape ? (selectedSlot.role === 'line' ? 'Line' : 'Shape') : 'Text'

        return (
          <div className="flex flex-col flex-1">
            {/* Element header: type + deselect + actions */}
            <div className="flex items-center gap-0 px-3 py-2 border-b border-border/40">
              <span className="flex-1 font-sans text-[11px] font-semibold text-foreground">
                {typeLabel}
              </span>
              <button
                onClick={() => duplicateElement(selectedSlot.id)}
                className={iconBtnCls}
                aria-label="Duplicate element"
                title="Duplicate"
              >
                <Copy size={11} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => bringForward(selectedSlot.id)}
                className={iconBtnCls}
                aria-label="Bring forward"
                title="Bring forward"
              >
                <ChevronUp size={11} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => sendBackward(selectedSlot.id)}
                className={iconBtnCls}
                aria-label="Send backward"
                title="Send backward"
              >
                <ChevronDown size={11} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => deleteElement(selectedSlot.id)}
                className={[iconBtnCls, 'hover:bg-accent hover:text-background'].join(' ')}
                aria-label="Delete element"
                title="Delete"
              >
                <Trash2 size={11} strokeWidth={2.5} />
              </button>
              {/* Deselect */}
              <button
                onClick={() => selectElement(null)}
                aria-label="Deselect"
                title="Deselect (Esc)"
                className="ml-1 rounded-md border-2 border-foreground px-2 py-1 font-sans text-[9px] font-semibold text-foreground hover:bg-foreground hover:text-background transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Esc
              </button>
            </div>

            {/* Reset to global — only when overrides present */}
            {hasOverrides && (
              <div className="px-3 pt-2">
                <button
                  onClick={() => resetElement(selectedSlot.id)}
                  className="w-full rounded-md border border-input py-1.5 font-sans text-[10px] font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  Reset to global
                </button>
              </div>
            )}

            <div className="flex flex-col flex-1 overflow-y-auto">

              {/* ── CONTENT (text only) ───────────────────────────────────────── */}
              {isText && selectedSlot.text && (
                <div className="px-3 pt-2 pb-1">
                  <Section id="rail-content" title="Content" defaultOpen>
                    <InspectorRow label="Content">
                      <textarea
                        aria-label="Content"
                        rows={2}
                        value={selectedSlot.content}
                        onChange={e => setContent(selectedSlot.id, e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-sans text-xs text-foreground resize-none focus:border-2 focus:border-foreground focus:outline-none"
                      />
                    </InspectorRow>
                  </Section>
                </div>
              )}

              {/* ── POSITION (all elements) ───────────────────────────────────── */}
              {resolvedBox && (
                <div className="px-3 pt-1 pb-1 border-t border-border/40">
                  <Section id="rail-position" title="Position" defaultOpen>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <NumberInput
                          id={`insp-x-${selectedSlot.id}`}
                          label="X position"
                          value={Math.round(resolvedBox.x)}
                          onChange={v => setBox(selectedSlot.id, { ...resolvedBox, x: v })}
                        />
                        <NumberInput
                          id={`insp-y-${selectedSlot.id}`}
                          label="Y position"
                          value={Math.round(resolvedBox.y)}
                          onChange={v => setBox(selectedSlot.id, { ...resolvedBox, y: v })}
                        />
                        <NumberInput
                          id={`insp-w-${selectedSlot.id}`}
                          label="Width"
                          value={Math.round(resolvedBox.w)}
                          min={1}
                          onChange={v => setBox(selectedSlot.id, { ...resolvedBox, w: v })}
                        />
                        <NumberInput
                          id={`insp-h-${selectedSlot.id}`}
                          label="Height"
                          value={Math.round(resolvedBox.h)}
                          min={1}
                          onChange={v => setBox(selectedSlot.id, { ...resolvedBox, h: v })}
                        />
                      </div>

                      {/* Opacity */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <FieldLabel>Opacity</FieldLabel>
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground font-bold">
                            {Math.round((selectedSlot.opacity ?? 1) * 100)}%
                          </span>
                        </div>
                        <Slider
                          aria-label="Opacity"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round((selectedSlot.opacity ?? 1) * 100)}
                          onChange={v => setOpacity(selectedSlot.id, v / 100)}
                        />
                      </div>

                      {/* Align */}
                      <div>
                        <FieldLabel>Align</FieldLabel>
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
                                'flex-1 flex items-center justify-center rounded-md border-2 border-foreground py-1.5',
                                'text-muted-foreground hover:bg-muted hover:text-foreground',
                                'transition-colors duration-100',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                              ].join(' ')}
                            >
                              <Icon size={13} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>
              )}

              {/* ── TRANSFORM (all elements, collapsed) ──────────────────────── */}
              {selectedSlot && (
                <div className="px-3 pt-1 pb-1 border-t border-border/40">
                  <Section id="rail-transform" title="Transform" defaultOpen>
                    <div className="space-y-2.5">
                      {/* Rotation */}
                      <div className="space-y-1">
                        <FieldLabel>Rotation</FieldLabel>
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
                            className="w-16 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs tabular-nums text-foreground focus:border-2 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="font-mono text-[11px] text-muted-foreground">°</span>
                          <Slider
                            aria-label="Rotation slider"
                            min={-180}
                            max={180}
                            step={1}
                            value={selectedSlot.rotation ?? 0}
                            onChange={v => setRotation(selectedSlot.id, v)}
                            className="flex-1"
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
                            'flex flex-1 items-center justify-center gap-1 rounded-md border-2 border-foreground py-1.5 font-sans text-[9px] font-semibold',
                            'active:scale-[0.97] transition-transform duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                            selectedSlot.flipH
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-foreground',
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
                            'flex flex-1 items-center justify-center gap-1 rounded-md border-2 border-foreground py-1.5 font-sans text-[9px] font-semibold',
                            'active:scale-[0.97] transition-transform duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
                            selectedSlot.flipV
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-foreground',
                          ].join(' ')}
                        >
                          <FlipVertical2 size={13} />
                          V
                        </button>
                      </div>

                      {/* Blend — Radix Select (no native popup) */}
                      <div className="flex flex-col gap-0.5">
                        <FieldLabel>Blend</FieldLabel>
                        <Select
                          id={`insp-blend-${selectedSlot.id}`}
                          aria-label="Blend mode"
                          value={selectedSlot.blend ?? 'normal'}
                          onValueChange={v => setBlend(selectedSlot.id, v)}
                          options={BLEND_OPTIONS}
                        />
                      </div>

                      {/* Shadow */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <FieldLabel>Shadow</FieldLabel>
                          <Switch
                            aria-label="Toggle shadow"
                            checked={!!selectedSlot.shadow}
                            onCheckedChange={checked => {
                              if (checked) {
                                setShadow(selectedSlot.id, { dx: 0, dy: 8, blur: 16, color: '#000000' })
                              } else {
                                setShadow(selectedSlot.id, null)
                              }
                            }}
                          />
                        </div>
                        {selectedSlot.shadow && (
                          <div className="grid grid-cols-3 gap-1">
                            <NumberInput
                              id={`insp-shadow-dx-${selectedSlot.id}`}
                              label="X"
                              value={selectedSlot.shadow.dx}
                              onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dx: v })}
                            />
                            <NumberInput
                              id={`insp-shadow-dy-${selectedSlot.id}`}
                              label="Y"
                              value={selectedSlot.shadow.dy}
                              onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, dy: v })}
                            />
                            <NumberInput
                              id={`insp-shadow-blur-${selectedSlot.id}`}
                              label="Blur"
                              value={selectedSlot.shadow.blur}
                              min={0}
                              onChange={v => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, blur: v })}
                            />
                            <div className="col-span-3 flex flex-col gap-0.5">
                              <FieldLabel>Color</FieldLabel>
                              <input
                                id={`insp-shadow-color-${selectedSlot.id}`}
                                type="color"
                                aria-label="Shadow colour"
                                value={selectedSlot.shadow.color}
                                onChange={e => setShadow(selectedSlot.id, { ...selectedSlot.shadow!, color: e.target.value })}
                                className="h-7 w-10 cursor-pointer rounded-md border-2 border-foreground p-0.5"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Corner radius + stroke — block and image only */}
                      {(isShape || isImage) && (
                        <div className="space-y-2">
                          <NumberInput
                            id={`insp-radius-${selectedSlot.id}`}
                            label="Corner radius"
                            value={selectedSlot.radius ?? 0}
                            min={0}
                            onChange={v => setRadius(selectedSlot.id, v)}
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <FieldLabel>Stroke</FieldLabel>
                              <input
                                id={`insp-stroke-${selectedSlot.id}`}
                                type="color"
                                aria-label="Stroke colour"
                                value={
                                  selectedSlot.stroke && !['accent', 'text'].includes(selectedSlot.stroke)
                                    ? selectedSlot.stroke
                                    : design.palette.accent
                                }
                                onChange={e => setStroke(selectedSlot.id, e.target.value)}
                                className="h-7 w-full cursor-pointer rounded-md border-2 border-foreground p-0.5"
                              />
                            </div>
                            <NumberInput
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
                  </Section>
                </div>
              )}

              {/* ── TYPE (text only, collapsed) ───────────────────────────────── */}
              {isText && selectedSlot.text && resolvedText && (
                <div className="px-3 pt-1 pb-1 border-t border-border/40">
                  <Section id="rail-type" title="Type" defaultOpen>
                    <div className="space-y-2.5">
                      {/* Typeface — Radix Select */}
                      <InspectorRow label="Typeface" overridden={ov.includes('family')}>
                        <Select
                          id={`insp-typeface-${selectedSlot.id}`}
                          aria-label="Typeface"
                          value={resolvedText.family}
                          onValueChange={v => overrideText(selectedSlot.id, { family: v as FontFamily })}
                          options={TYPEFACE_OPTIONS}
                        />
                      </InspectorRow>

                      {/* Size */}
                      <InspectorRow label="Size" overridden={ov.includes('size')}>
                        <input
                          id={`insp-size-${selectedSlot.id}`}
                          aria-label="Size"
                          type="number"
                          min={10}
                          max={600}
                          value={resolvedText.size}
                          onChange={e => overrideText(selectedSlot.id, { size: Number(e.target.value), fit: 'fixed' })}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs tabular-nums text-foreground focus:border-2 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </InspectorRow>

                      {/* Weight — Radix Select */}
                      <InspectorRow label="Weight">
                        <Select
                          id={`insp-weight-${selectedSlot.id}`}
                          aria-label="Weight"
                          value={String(selectedSlot.text.weight ?? 400)}
                          onValueChange={v => setText(selectedSlot.id, { weight: Number(v) })}
                          options={WEIGHT_OPTIONS}
                        />
                      </InspectorRow>

                      {/* Tracking */}
                      <InspectorRow label="Tracking" overridden={ov.includes('tracking')}>
                        <input
                          id={`insp-tracking-${selectedSlot.id}`}
                          aria-label="Tracking"
                          type="number"
                          step={0.005}
                          value={resolvedText.tracking}
                          onChange={e => overrideText(selectedSlot.id, { tracking: Number(e.target.value) })}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs tabular-nums text-foreground focus:border-2 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </InspectorRow>

                      {/* Leading */}
                      <InspectorRow label="Leading" overridden={ov.includes('leading')}>
                        <input
                          id={`insp-leading-${selectedSlot.id}`}
                          aria-label="Leading"
                          type="number"
                          step={0.01}
                          value={resolvedText.leading}
                          onChange={e => overrideText(selectedSlot.id, { leading: Number(e.target.value) })}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs tabular-nums text-foreground focus:border-2 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                                'flex-1 flex items-center justify-center rounded-md border-2 border-foreground py-1.5',
                                'transition-colors duration-100',
                                selectedSlot.text?.align === a
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-background border-foreground text-muted-foreground hover:bg-muted hover:text-foreground',
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
                                'flex-1 rounded-md border-2 border-foreground py-1.5 font-sans text-[9px] font-semibold',
                                'transition-colors duration-100',
                                selectedSlot.text?.fit === f
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-foreground',
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
                            className="h-7 w-10 cursor-pointer rounded-md border-2 border-foreground p-0.5"
                          />
                          {!selectedSlot.color && (
                            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">global</span>
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
                            { value: 'none',  icon: <CaseSensitive size={13} />, title: 'None' },
                            { value: 'upper', icon: <CaseUpper size={13} />,    title: 'UPPER' },
                            { value: 'lower', icon: <CaseLower size={13} />,    title: 'lower' },
                            { value: 'title', icon: <Type size={13} />,         title: 'Title' },
                          ] as const).map(({ value, icon, title }) => (
                            <button
                              key={value}
                              onClick={() => setTextTransform(selectedSlot.id, value)}
                              aria-label={`Case ${title}`}
                              title={title}
                              data-case={value}
                              className={[
                                'flex-1 flex items-center justify-center rounded-md border-2 border-foreground py-1.5',
                                'transition-colors duration-100',
                                (selectedSlot.textTransform ?? 'none') === value
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-background border-foreground text-muted-foreground hover:bg-muted hover:text-foreground',
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
                                'flex-1 flex items-center justify-center gap-1 rounded-md border-2 border-foreground py-1.5 font-sans text-[9px] font-semibold',
                                'transition-colors duration-100',
                                (selectedSlot.listStyle ?? 'none') === value
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-foreground',
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
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs tabular-nums text-foreground focus:border-2 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </InspectorRow>
                    </div>
                  </Section>
                </div>
              )}

              {/* ── EFFECTS (image only, open) ────────────────────────────────── */}
              {isImage && (
                <div className="px-3 pt-1 pb-1 border-t border-border/40">
                  <Section id="rail-effects" title="Effects" defaultOpen>
                    <div className="space-y-2.5">
                      <ImageInput slotId={selectedSlot.id} />
                      {selectedSlot.content && (
                        <button
                          onClick={() => requestCrop(selectedSlot.id, selectedSlot.content)}
                          className={[
                            'w-full rounded-md border-2 border-foreground py-1.5 font-sans text-[10px] font-medium text-foreground',
                            'hover:bg-muted transition-colors duration-100',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                          ].join(' ')}
                        >
                          Re-crop current image
                        </button>
                      )}
                      <InspectorRow label="Black & white" overridden={selectedSlot.bw !== undefined}>
                        <Checkbox
                          id={`insp-bw-${selectedSlot.id}`}
                          label="Black & white"
                          checked={selectedSlot.bw ?? design.style.bwImage}
                          onChange={v => setBw(selectedSlot.id, v)}
                        />
                      </InspectorRow>
                      <ImageEffectsPanel
                        slotId={selectedSlot.id}
                        effect={selectedSlot.imageEffect}
                        onSetEffect={setImageEffect}
                      />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── FILL (shape / line only, open) ───────────────────────────── */}
              {isShape && (
                <div className="px-3 pt-1 pb-1 border-t border-border/40">
                  <Section id="rail-fill" title="Fill" defaultOpen>
                    <div className="flex gap-1 flex-wrap">
                      {(['accent', 'text'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setFill(selectedSlot.id, f)}
                          className={[
                            'flex-1 rounded-md border-2 border-foreground py-1.5 font-sans text-[9px] font-semibold',
                            'transition-colors duration-100',
                            selectedSlot.fill === f
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-foreground',
                          ].join(' ')}
                        >
                          {f}
                        </button>
                      ))}
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
                        className="h-8 w-8 cursor-pointer rounded-md border-2 border-foreground p-0.5"
                      />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── LAYERS (always, collapsed) ────────────────────────────────── */}
              <div className="px-4 pt-1 pb-1 border-t border-border">
                <Section id="rail-layers" title="Layers" defaultOpen={false}>
                  <div className="-mx-4"><LayersList /></div>
                </Section>
              </div>

            </div>

            {/* Snap to grid — pinned bottom */}
            <div className="mt-auto border-t border-border/40 px-3 py-3">
              <Checkbox
                id="rail-snap"
                label="Snap to grid"
                checked={snap}
                onChange={setSnap}
                data-checkbox="rail-snap"
              />
            </div>
          </div>
        )
      })()}

      {/* Snap to grid for empty state */}
      {!selectedSlot && (
        <div className="mt-auto border-t border-border px-4 py-3">
          <Checkbox
            id="rail-snap"
            label="Snap to grid"
            checked={snap}
            onChange={setSnap}
            data-checkbox="rail-snap"
          />
        </div>
      )}
    </aside>
  )
}

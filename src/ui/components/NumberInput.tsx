// src/ui/components/NumberInput.tsx
// Premium number field with Figma-style drag-to-scrub on the label
import { useRef, useCallback } from 'react'
import type { PointerEvent } from 'react'
import { cn } from '../lib/cn'

interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  className?: string
  /** Optional id — also sets the input's id for <label> association */
  id?: string
  /** aria-label override for the input (defaults to label text) */
  'aria-label'?: string
}

export function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  id,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragState = useRef<{
    startX: number
    startValue: number
    active: boolean
  } | null>(null)

  const clamp = useCallback(
    (v: number) => {
      let r = v
      if (min !== undefined) r = Math.max(min, r)
      if (max !== undefined) r = Math.min(max, r)
      return r
    },
    [min, max],
  )

  const handleLabelPointerDown = useCallback(
    (e: PointerEvent<HTMLSpanElement>) => {
      e.preventDefault()
      dragState.current = { startX: e.clientX, startValue: value, active: true }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [value],
  )

  const handleLabelPointerMove = useCallback(
    (e: PointerEvent<HTMLSpanElement>) => {
      if (!dragState.current?.active) return
      const dx = e.clientX - dragState.current.startX
      // 4px per step
      const delta = Math.round(dx / 4) * step
      const next = clamp(dragState.current.startValue + delta)
      if (next !== value) onChange(next)
    },
    [value, onChange, step, clamp],
  )

  const handleLabelPointerUp = useCallback(() => {
    if (dragState.current) dragState.current.active = false
    dragState.current = null
  }, [])

  const inputId = id ?? `ni-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span
        role="presentation"
        className={cn(
          'cursor-ew-resize select-none text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400',
          'hover:text-neutral-600 transition-colors duration-100',
        )}
        title={`Drag to change ${label}`}
        onPointerDown={handleLabelPointerDown}
        onPointerMove={handleLabelPointerMove}
        onPointerUp={handleLabelPointerUp}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        aria-label={ariaLabel ?? label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const v = Number(e.target.value)
          if (!isNaN(v)) onChange(clamp(v))
        }}
        className={cn(
          'w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs tabular-nums text-neutral-800',
          'transition-[border-color,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          'hover:border-neutral-300',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          // Hide native spinners
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />
    </div>
  )
}

// src/ui/controls/NumberField.tsx
// Neo-brutalist number field with Figma-style drag-to-scrub on the label
import { useRef, useCallback } from 'react'
import type { PointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface NumberFieldProps {
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

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  id,
  'aria-label': ariaLabel,
}: NumberFieldProps) {
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
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Scrubable label — clean sans */}
      <span
        role="presentation"
        className={cn(
          'cursor-ew-resize select-none font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground',
          'hover:text-foreground transition-colors duration-100',
        )}
        title={`Drag to change ${label}`}
        onPointerDown={handleLabelPointerDown}
        onPointerMove={handleLabelPointerMove}
        onPointerUp={handleLabelPointerUp}
      >
        {label}
      </span>
      {/* Value input — mono for numeric data */}
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
          'w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs tabular-nums text-foreground',
          'transition-[border-color] duration-100',
          'focus:border-2 focus:border-foreground focus:outline-none',
          // Hide native spinners
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />
    </div>
  )
}

// src/ui/components/SegmentedControl.tsx
// Reusable segmented control — extracted from CanvasChips
import { type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface SegmentOption<T extends string = string> {
  value: T
  label: ReactNode
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string = string> {
  value: T
  options: SegmentOption<T>[]
  onValueChange: (value: T) => void
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<T extends string = string>({
  value,
  options,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5',
        className,
      )}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          aria-label={typeof opt.ariaLabel === 'string' ? opt.ariaLabel : undefined}
          onClick={() => onValueChange(opt.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold',
            'transition-[background-color,color,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20',
            'active:scale-[0.97]',
            value === opt.value
              ? 'bg-neutral-900 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

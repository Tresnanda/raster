// src/ui/controls/SegmentedControl.tsx
// Neo-brutalist segmented control — hard borders, inverted active, 6px radius
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
        'inline-flex flex-wrap gap-0 rounded-md border-2 border-foreground bg-background overflow-hidden',
        className,
      )}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          aria-label={typeof opt.ariaLabel === 'string' ? opt.ariaLabel : undefined}
          onClick={() => onValueChange(opt.value)}
          className={cn(
            'px-2.5 py-1.5 font-sans text-[10px] font-semibold',
            'transition-colors duration-100',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:z-10',
            // Dividers between items
            i > 0 && 'border-l-2 border-foreground',
            value === opt.value
              ? 'bg-foreground text-background'
              : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// src/ui/controls/Slider.tsx — Premium slider with simple {value, onChange} API
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  className?: string
  'aria-label'?: string
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {/* aria-label on Thumb so role="slider" + name query works in tests */}
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        className={cn(
          'block h-3.5 w-3.5 rounded-full bg-background border border-border shadow-sm',
          'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          'hover:scale-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      />
    </SliderPrimitive.Root>
  )
}

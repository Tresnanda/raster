// src/ui/controls/Slider.tsx — Ink Brutalism slider
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
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-none border-2 border-foreground bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-foreground" />
      </SliderPrimitive.Track>
      {/* aria-label on Thumb so role="slider" + name query works in tests */}
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        className={cn(
          'block h-4 w-4 rounded-none border-2 border-foreground bg-background',
          'transition-colors duration-100',
          'hover:bg-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
          'active:translate-x-px active:translate-y-px',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      />
    </SliderPrimitive.Root>
  )
}

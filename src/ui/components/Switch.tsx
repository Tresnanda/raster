// src/ui/components/Switch.tsx
// Premium Radix Switch — pill toggle
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '../lib/cn'

interface SwitchProps {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  'aria-label'?: string
}

export function Switch({ id, checked, onCheckedChange, className, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-[background-color,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'bg-neutral-200 data-[state=checked]:bg-neutral-900',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          'translate-x-0 data-[state=checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

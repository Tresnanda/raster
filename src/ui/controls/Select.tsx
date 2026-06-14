// src/ui/controls/Select.tsx — Neo-brutalist Radix Select
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  className?: string
  'aria-label'?: string
  id?: string
  placeholder?: string
}

export function Select({
  value,
  onValueChange,
  options,
  className,
  'aria-label': ariaLabel,
  id,
  placeholder,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2',
          'rounded-md border border-input bg-background px-2.5 py-1.5',
          'font-sans text-xs font-medium text-foreground',
          'transition-[border-color] duration-100',
          'focus-visible:border-2 focus-visible:border-foreground focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          '[&>span]:line-clamp-1 [&>span]:text-left',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            size={12}
            strokeWidth={2.5}
            className="shrink-0 text-muted-foreground"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={2}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-md border-2 border-foreground bg-background shadow-brutal',
            'p-1',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=bottom]:translate-y-0.5',
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map(opt => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center',
                  'rounded-sm py-1.5 pl-2.5 pr-8',
                  'font-sans text-xs font-medium text-foreground outline-none',
                  'transition-colors duration-100',
                  'data-[highlighted]:bg-foreground data-[highlighted]:text-background',
                  'data-[state=checked]:font-semibold',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                )}
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={10} strokeWidth={3} />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

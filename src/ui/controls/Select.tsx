// src/ui/controls/Select.tsx — Premium Radix Select replacing native <select>
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
          'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800',
          'transition-[border-color,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          'hover:border-neutral-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&>span]:line-clamp-1 [&>span]:text-left',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className="shrink-0 text-neutral-400 transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-lg border border-neutral-200 bg-white shadow-lg',
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
                  'rounded-md py-1.5 pl-2 pr-8 text-sm text-neutral-800 outline-none',
                  'transition-colors duration-100',
                  'data-[highlighted]:bg-neutral-100',
                  'data-[state=checked]:font-medium',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                )}
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={12} strokeWidth={2.5} className="text-neutral-900" />
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

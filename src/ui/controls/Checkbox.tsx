// src/ui/controls/Checkbox.tsx
// Neo-brutalist checkbox — 2px border, ink fill, rounded-sm, clean sans label
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
  /** data attribute forwarded to the hidden <input> — keeps existing tests green */
  'data-checkbox'?: string
}

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  className,
  'data-checkbox': dataCheckbox,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn('flex cursor-pointer items-center gap-2 select-none group', className)}
    >
      {/* Hidden real input for a11y + keyboard + test fireEvent */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        // eslint-disable-next-line react/no-unknown-property
        {...(dataCheckbox ? ({ 'data-rail-checkbox': dataCheckbox } as Record<string, string>) : {})}
      />
      {/* Visual box — neo-brutalist: 2px border, rounded-sm */}
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2',
          'transition-colors duration-100',
          checked
            ? 'border-foreground bg-foreground'
            : 'border-foreground bg-background group-hover:bg-muted',
        )}
      >
        {checked && <Check size={9} strokeWidth={3.5} className="text-background" />}
      </span>
      <span className="font-sans text-[11px] font-medium text-foreground">
        {label}
      </span>
    </label>
  )
}

// src/ui/controls/Checkbox.tsx
// Premium custom checkbox — promoted from ComposerRail/StyleControls
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
      className={cn('flex cursor-pointer items-center gap-2.5 select-none', className)}
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
      {/* Visual box */}
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          'transition-colors duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          checked
            ? 'border-neutral-900 bg-neutral-900'
            : 'border-neutral-300 bg-white hover:border-neutral-400',
        )}
      >
        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )
}

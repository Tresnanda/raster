// src/ui/controls/Section.tsx
// Premium collapsible section using Radix Accordion, with localStorage persistence
import { useState, type ReactNode } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionProps {
  id: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Section({ id, title, children, defaultOpen = true, className }: SectionProps) {
  const storageKey = `raster-section-${id}`

  const [value, setValue] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) return stored === 'open' ? id : ''
    } catch {}
    return defaultOpen ? id : ''
  })

  const handleChange = (next: string) => {
    setValue(next)
    try {
      localStorage.setItem(storageKey, next === id ? 'open' : 'closed')
    } catch {}
  }

  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      value={value}
      onValueChange={handleChange}
      className={cn('w-full', className)}
    >
      <AccordionPrimitive.Item value={id} className="border-0">
        <AccordionPrimitive.Header asChild>
          <AccordionPrimitive.Trigger
            className={cn(
              'flex w-full items-center gap-1.5 px-0 py-1',
              'text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500',
              'transition-colors duration-150 hover:text-neutral-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 rounded',
              '[&[data-state=open]>svg]:rotate-90',
            )}
          >
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              className="shrink-0 text-neutral-400 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
            />
            {title}
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>

        <AccordionPrimitive.Content
          className={cn(
            'overflow-hidden',
            'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
          )}
        >
          <div className="pb-2 pt-1">{children}</div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  )
}

// Convenience wrapper for multiple sections
interface AccordionProps {
  children: ReactNode
  className?: string
}

export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn('space-y-0.5', className)}>{children}</div>
}

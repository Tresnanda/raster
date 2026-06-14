// src/ui/controls/Section.tsx
// Ink Brutalism collapsible section using Radix Accordion, with localStorage persistence
import { useState, type ReactNode } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
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
              'group flex w-full items-center justify-between gap-2 px-0 py-2',
              'font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground',
              'transition-colors duration-100 hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            )}
          >
            {/* Industrial section label with bracket markers */}
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-muted-foreground/60 font-mono text-[11px]">▚</span>
              <span>{title.toUpperCase()}</span>
            </span>
            {/* +/− caret */}
            <span
              aria-hidden="true"
              className="font-mono text-[14px] font-bold text-muted-foreground group-data-[state=open]:hidden leading-none"
            >
              +
            </span>
            <span
              aria-hidden="true"
              className="hidden font-mono text-[14px] font-bold text-muted-foreground group-data-[state=open]:inline leading-none"
            >
              −
            </span>
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
  return <div className={cn('space-y-0', className)}>{children}</div>
}

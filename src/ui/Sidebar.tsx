// src/ui/Sidebar.tsx
import type React from 'react'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Header } from './sidebar/Header'
import { LayoutGrid } from './sidebar/LayoutGrid'
import { CanvasChips } from './sidebar/CanvasChips'
import { ContentFields } from './sidebar/ContentFields'
import { TypographyControls } from './sidebar/TypographyControls'
import { StyleControls } from './sidebar/StyleControls'
import { ExportControls } from './sidebar/ExportControls'

interface SidebarProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2 mt-6">
      {children}
    </div>
  )
}

export function Sidebar({ svgRef }: SidebarProps) {
  const sidebarRootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.sb-section', {
        y: 12,
        opacity: 0,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.04,
      })
    })
    return () => mm.revert()
  }, { scope: sidebarRootRef })

  return (
    <aside className="w-[360px] shrink-0 min-h-0 overscroll-contain border-r border-neutral-200 bg-white overflow-y-auto">
      <div ref={sidebarRootRef} className="p-5">
        <Header />

        <SectionLabel>Layout</SectionLabel>
        <LayoutGrid />

        <SectionLabel>Canvas</SectionLabel>
        <CanvasChips />

        <SectionLabel>Content</SectionLabel>
        <ContentFields />

        <SectionLabel>Typography</SectionLabel>
        <TypographyControls />

        <SectionLabel>Style</SectionLabel>
        <StyleControls />

        <SectionLabel>Export</SectionLabel>
        <ExportControls svgRef={svgRef} />
      </div>
    </aside>
  )
}

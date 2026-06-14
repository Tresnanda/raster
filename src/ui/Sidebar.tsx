// src/ui/Sidebar.tsx — Ink Brutalism global design pane
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
import { Section } from './controls/Section'

interface SidebarProps {
  svgRef: React.RefObject<SVGSVGElement | null>
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
    <aside
      aria-label="Design"
      className="w-[360px] shrink-0 min-h-0 overscroll-contain border-r-2 border-foreground bg-background overflow-y-auto"
    >
      <div ref={sidebarRootRef} className="min-w-0 px-4 py-4 pb-10 space-y-0">
        {/* Brand masthead */}
        <div className="sb-section pb-4 mb-0">
          <Header />
        </div>

        {/* Layouts */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-layouts" title="Layouts" defaultOpen>
            <LayoutGrid />
          </Section>
        </div>

        {/* Canvas format */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-canvas" title="Canvas" defaultOpen>
            <CanvasChips />
          </Section>
        </div>

        {/* Typography — collapsed by default */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-type" title="Type" defaultOpen={false}>
            <TypographyControls />
          </Section>
        </div>

        {/* Style — open by default */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-style" title="Style" defaultOpen>
            <StyleControls />
          </Section>
        </div>

        {/* Content slots */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-content" title="Content" defaultOpen>
            <ContentFields />
          </Section>
        </div>

        {/* Export — collapsed */}
        <div className="sb-section border-t-2 border-foreground">
          <Section id="sidebar-export" title="Export" defaultOpen={false}>
            <ExportControls svgRef={svgRef} />
          </Section>
        </div>

        {/* Bottom border */}
        <div className="border-t-2 border-foreground" />
      </div>
    </aside>
  )
}

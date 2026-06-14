// src/ui/Sidebar.tsx — Neo-brutalist design pane
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
import { MotionControls } from './sidebar/MotionControls'
import { SeriesControls } from './sidebar/SeriesControls'
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
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-layouts" title="Layouts" defaultOpen>
            <LayoutGrid />
          </Section>
        </div>

        {/* Canvas format */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-canvas" title="Canvas" defaultOpen>
            <CanvasChips />
          </Section>
        </div>

        {/* Typography — collapsed by default */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-type" title="Type" defaultOpen={false}>
            <TypographyControls />
          </Section>
        </div>

        {/* Style — open by default */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-style" title="Style" defaultOpen>
            <StyleControls />
          </Section>
        </div>

        {/* Motion — kinetic text (textmotion) */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-motion" title="Motion" defaultOpen={false}>
            <MotionControls svgRef={svgRef} />
          </Section>
        </div>

        {/* Content slots — collapsed; on-canvas editing is primary */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-content" title="Content" defaultOpen={false}>
            <ContentFields />
          </Section>
        </div>

        {/* Series — list → matched poster set */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-series" title="Series" defaultOpen={false}>
            <SeriesControls />
          </Section>
        </div>

        {/* Export — collapsed */}
        <div className="sb-section border-t border-border/40">
          <Section id="sidebar-export" title="Export" defaultOpen={false}>
            <ExportControls svgRef={svgRef} />
          </Section>
        </div>

        {/* Bottom rule */}
        <div className="border-t border-border/40" />
      </div>
    </aside>
  )
}

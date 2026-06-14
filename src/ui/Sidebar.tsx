// src/ui/Sidebar.tsx — Global design pane with collapsible Sections
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
import { Section } from './components/Section'

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
      className="w-[360px] shrink-0 min-h-0 overscroll-contain border-r border-neutral-100 bg-white overflow-y-auto"
    >
      <div ref={sidebarRootRef} className="px-4 py-4 space-y-0.5">
        {/* Brand lockup — not a collapsible section */}
        <div className="sb-section pb-4 border-b border-neutral-100 mb-3">
          <Header />
        </div>

        {/* Layouts — open by default */}
        <div className="sb-section">
          <Section id="sidebar-layouts" title="Layouts" defaultOpen>
            <LayoutGrid />
          </Section>
        </div>

        <div className="border-t border-neutral-100" />

        {/* Canvas format */}
        <div className="sb-section">
          <Section id="sidebar-canvas" title="Canvas" defaultOpen>
            <CanvasChips />
          </Section>
        </div>

        <div className="border-t border-neutral-100" />

        {/* Typography — collapsed by default (global defaults) */}
        <div className="sb-section">
          <Section id="sidebar-type" title="Type" defaultOpen={false}>
            <TypographyControls />
          </Section>
        </div>

        <div className="border-t border-neutral-100" />

        {/* Style — open by default */}
        <div className="sb-section">
          <Section id="sidebar-style" title="Style" defaultOpen>
            <StyleControls />
          </Section>
        </div>

        <div className="border-t border-neutral-100" />

        {/* Content slots — open by default; on-canvas editing is primary but
            the section is readily available without requiring a click */}
        <div className="sb-section">
          <Section id="sidebar-content" title="Content" defaultOpen>
            <ContentFields />
          </Section>
        </div>

        <div className="border-t border-neutral-100" />

        {/* Export — collapsed */}
        <div className="sb-section">
          <Section id="sidebar-export" title="Export" defaultOpen={false}>
            <ExportControls svgRef={svgRef} />
          </Section>
        </div>
      </div>
    </aside>
  )
}

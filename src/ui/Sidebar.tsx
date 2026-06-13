// src/ui/Sidebar.tsx
import type React from 'react'
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
  return (
    <aside className="w-[360px] shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
      <div className="p-5">
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

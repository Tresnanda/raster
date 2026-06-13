import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { FreeOverlay } from './FreeOverlay'
import { EditOverlay } from './EditOverlay'

export function CanvasStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const c = canvasFor(design.format)
  // Letterbox: preserve aspect ratio; fit entirely within available space
  const isPortrait = c.h >= c.w

  // Measure the rendered pixel width of the SVG container to compute scale.
  // scale = renderedPixelWidth / canvas.w — used by FreeOverlay to align handles.
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.getBoundingClientRect().width / c.w)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [c.w])

  // ── Motion 1: mount entrance (once) ──────────────────────────────────────
  useGSAP(() => {
    if (!containerRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(containerRef.current!, {
        scale: 0.96,
        opacity: 0,
        duration: 0.4,
        ease: 'power3.out',
        force3D: true,
      })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [] })

  // ── Motion 2: poster reflow on layout/seed change ─────────────────────────
  useGSAP(() => {
    const groups = svgRef.current?.querySelectorAll('[data-slot]')
    if (!groups?.length) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(groups, {
        y: 26,
        opacity: 0,
        scale: 0.985,
        transformOrigin: '50% 50%',
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.035,
        force3D: true,
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.from(groups, { opacity: 0, duration: 0.2, stagger: 0.02 })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [design.layout, design.seed] })

  // ── Motion 3: format change settle ───────────────────────────────────────
  useGSAP(() => {
    if (!containerRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(containerRef.current!, {
        opacity: 0.6,
        scale: 0.99,
        duration: 0.22,
        ease: 'power3.out',
        force3D: true,
      })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [design.format] })

  return (
    <div className="flex h-full items-center justify-center bg-neutral-200 p-8">
      <div
        ref={containerRef}
        className="relative shadow-2xl"
        style={{
          aspectRatio: `${c.w}/${c.h}`,
          maxHeight: '100%',
          maxWidth: '100%',
          height: isPortrait ? '100%' : 'auto',
          width: isPortrait ? 'auto' : '100%',
        }}
      >
        <Renderer design={design} svgRef={svgRef} />
        {design.mode === 'free' ? <FreeOverlay scale={scale} /> : <EditOverlay scale={scale} />}
      </div>
    </div>
  )
}

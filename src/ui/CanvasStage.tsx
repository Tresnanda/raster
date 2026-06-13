import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { ComposerOverlay } from './ComposerOverlay'
import { GrainAnimator } from './GrainAnimator'

export function CanvasStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const snap = useDesign(s => s.snap)
  const c = canvasFor(design.format)
  // Letterbox: preserve aspect ratio; fit entirely within available space
  const isPortrait = c.h >= c.w

  // Measure the rendered pixel width of the SVG container to compute scale.
  // scale = renderedPixelWidth / canvas.w — used by ComposerOverlay to align handles.
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

  // ── Tracks for add-element pop and surprise detection ─────────────────────
  const prevSlotsLenRef = useRef(design.slots.length)
  const prevArchetypeRef = useRef(design.archetype)

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
  // For Surprise (archetype just became 'generated'), use a bigger flourish.
  useGSAP(() => {
    const groups = svgRef.current?.querySelectorAll('[data-slot]')
    if (!groups?.length) return

    const wasGenerated =
      design.archetype === 'generated' && prevArchetypeRef.current !== 'generated'
    prevArchetypeRef.current = design.archetype

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (wasGenerated) {
        // Surprise: slightly bigger flourish
        gsap.from(groups, {
          y: 40,
          opacity: 0,
          scale: 0.97,
          transformOrigin: '50% 50%',
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.045,
          force3D: true,
        })
      } else {
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
      }
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

  // ── Motion 4: add-element pop ─────────────────────────────────────────────
  // Runs when a new slot is added (slots.length increases). Animates the LAST
  // added [data-slot] group in the SVG. Guard: only on increase, not on delete.
  useGSAP(() => {
    const currentLen = design.slots.length
    const prevLen = prevSlotsLenRef.current
    prevSlotsLenRef.current = currentLen

    // Only animate on increase (add), not delete/initial render
    if (currentLen <= prevLen) return

    const groups = svgRef.current?.querySelectorAll('[data-slot]')
    if (!groups?.length) return
    const newGroup = groups[groups.length - 1]
    if (!newGroup) return

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(newGroup, {
        scale: 0.96,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.2,
        ease: 'power3.out',
        force3D: true,
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.from(newGroup, { opacity: 0, duration: 0.15 })
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [design.slots.length] })

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
        <ComposerOverlay scale={scale} snap={snap} />
      </div>
      <GrainAnimator svgRef={svgRef} enabled={design.style.filmGrain} />
    </div>
  )
}

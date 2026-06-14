import type React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Minus, Plus, Maximize, Scan, X as XIcon } from 'lucide-react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { ComposerOverlay } from './ComposerOverlay'
import { GrainAnimator } from './GrainAnimator'
import { useImageEffectProcessor } from './useImageEffectProcessor'
import type { Guide } from '../design/guides'

// ── ZoomHUD ───────────────────────────────────────────────────────────────────

const hudBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '3px 6px', border: 'none', background: 'transparent',
  cursor: 'pointer', color: '#18181B',
}

function ZoomHUD() {
  const zoom = useDesign(s => s.zoom)
  const setZoom = useDesign(s => s.setZoom)
  const zoomToFit = useDesign(s => s.zoomToFit)
  const setPan = useDesign(s => s.setPan)

  const pct = Math.round(zoom * 100)

  return (
    <div data-zoom-hud style={{
      position: 'absolute', bottom: 16, left: 16,
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#FFFFFF', border: '2px solid #18181B',
      borderRadius: '6px', padding: '0',
      boxShadow: '2px 2px 0 0 #18181B',
      fontFamily: "'Space Mono', ui-monospace, monospace",
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      userSelect: 'none', zIndex: 50,
      overflow: 'hidden',
    }}>
      <button aria-label="Zoom out" onClick={() => setZoom(zoom / 1.25)} style={hudBtnStyle}>
        <Minus size={11} strokeWidth={2.5} />
      </button>
      <div style={{ width: 1, background: '#18181B', alignSelf: 'stretch', opacity: 0.3 }} />
      <button
        aria-label="Reset to fit"
        data-zoom-pct
        onClick={() => { zoomToFit(); setPan({ x: 0, y: 0 }) }}
        style={{ ...hudBtnStyle, minWidth: 48, fontVariantNumeric: 'tabular-nums' }}
      >
        {pct}%
      </button>
      <div style={{ width: 1, background: '#18181B', alignSelf: 'stretch', opacity: 0.3 }} />
      <button aria-label="Zoom in" onClick={() => setZoom(zoom * 1.25)} style={hudBtnStyle}>
        <Plus size={11} strokeWidth={2.5} />
      </button>
      <div style={{ width: 1, background: '#18181B', alignSelf: 'stretch', opacity: 0.3 }} />
      <button aria-label="Fit" title="Fit to screen" onClick={() => { zoomToFit(); setPan({ x: 0, y: 0 }) }} style={hudBtnStyle}>
        <Maximize size={11} strokeWidth={2.5} />
      </button>
      <div style={{ width: 1, background: '#18181B', alignSelf: 'stretch', opacity: 0.3 }} />
      <button aria-label="100%" title="100%" onClick={() => { useDesign.getState().zoomTo100(); setPan({ x: 0, y: 0 }) }} style={hudBtnStyle}>
        <Scan size={11} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ── CanvasStage ───────────────────────────────────────────────────────────────

export function CanvasStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const snap = useDesign(s => s.snap)
  const guides = useDesign(s => s.guides)
  const addGuide = useDesign(s => s.addGuide)
  const removeGuide = useDesign(s => s.removeGuide)
  const zoom = useDesign(s => s.zoom)
  const pan = useDesign(s => s.pan)
  const setZoom = useDesign(s => s.setZoom)
  const setPan = useDesign(s => s.setPan)

  const c = canvasFor(design.format)
  // Letterbox: preserve aspect ratio; fit entirely within available space
  const isPortrait = c.h >= c.w

  // Measure the rendered pixel width of the SVG container to compute scale.
  // scale = renderedPixelWidth / canvas.w — used by ComposerOverlay to align handles.
  // getBoundingClientRect() includes CSS transform scale so it returns the visual size.
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const safeScale = scale > 0 ? scale : 1

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.getBoundingClientRect().width / c.w)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [c.w, zoom])

  // Run image effect processor -- watches image slots and re-derives content
  useImageEffectProcessor()

  // ── Space + drag / middle-mouse pan ───────────────────────────────────────

  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [draftGuide, setDraftGuide] = useState<Guide | null>(null)

  // Track pan drag state in a ref to avoid stale closures in pointer handlers
  const panDragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      e.preventDefault()
      setIsSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setIsSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // ── Wheel zoom (non-passive so we can preventDefault) ────────────────────

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { zoom: currentZoom, pan: currentPan } = useDesign.getState()

      if (e.ctrlKey || e.metaKey) {
        // Pinch or Ctrl+scroll → zoom to cursor
        const factor = e.deltaY < 0 ? 1.1 : (1 / 1.1)
        const rect = el.getBoundingClientRect()
        const cursorX = e.clientX - rect.left - rect.width / 2
        const cursorY = e.clientY - rect.top - rect.height / 2
        const newZoom = Math.min(8, Math.max(0.1, currentZoom * factor))
        const worldX = (cursorX - currentPan.x) / currentZoom
        const worldY = (cursorY - currentPan.y) / currentZoom
        setPan({ x: cursorX - worldX * newZoom, y: cursorY - worldY * newZoom })
        setZoom(newZoom)
      } else {
        // Plain scroll → pan
        setPan({ x: currentPan.x - e.deltaX, y: currentPan.y - e.deltaY })
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setZoom, setPan])

  // ── Pointer handlers for pan drag ────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Middle mouse button (button=1) or Space+left-click (button=0)
    if (e.button !== 1 && !(e.button === 0 && isSpaceHeld)) return
    e.preventDefault()
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    }
    setIsPanning(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return
    const { startX, startY, startPanX, startPanY } = panDragRef.current
    setPan({
      x: startPanX + (e.clientX - startX),
      y: startPanY + (e.clientY - startY),
    })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return
    ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    panDragRef.current = null
    setIsPanning(false)
  }

  // ── Cursor style ──────────────────────────────────────────────────────────

  const cursor = isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default'

  const guideFromPointer = (axis: 'x' | 'y', clientX: number, clientY: number): Guide | null => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return null
    const pos = axis === 'x'
      ? ((clientX - rect.left) / rect.width) * c.w
      : ((clientY - rect.top) / rect.height) * c.h
    return { axis, pos: Math.round(Math.max(0, Math.min(axis === 'x' ? c.w : c.h, pos))) }
  }

  const startGuideDrag = (axis: 'x' | 'y', e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    let latest = guideFromPointer(axis, e.clientX, e.clientY)
    setDraftGuide(latest)

    const move = (ev: PointerEvent) => {
      latest = guideFromPointer(axis, ev.clientX, ev.clientY)
      setDraftGuide(latest)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    const up = (ev: PointerEvent) => {
      cleanup()
      const guide = guideFromPointer(axis, ev.clientX, ev.clientY) ?? latest
      if (guide) addGuide(guide)
      setDraftGuide(null)
    }
    const cancel = () => {
      cleanup()
      setDraftGuide(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

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

  const guideLayerScale = scale / (zoom > 0 ? zoom : 1)
  const guideHandleSize = 18 / safeScale
  const guideHandleGap = 5 / safeScale
  const guideHandleBorder = 1.5 / safeScale
  const guideHandleShadow = 1.5 / safeScale
  const guideLineWidth = 1 / safeScale
  const guideLayerGuides = draftGuide ? [...guides, draftGuide] : guides
  const addCenteredGuide = (axis: 'x' | 'y') => {
    addGuide({ axis, pos: Math.round((axis === 'x' ? c.w : c.h) / 2) })
  }

  return (
    <div
      ref={stageRef}
      className="flex h-full items-center justify-center overflow-hidden"
      style={{ background: '#EEECEA', position: 'relative' as const, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Pan translation wrapper */}
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {/* containerRef: the letterboxed poster box — applies zoom scale */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            boxShadow: '4px 4px 0 0 #18181B',
            aspectRatio: `${c.w}/${c.h}`,
            maxHeight: '100%',
            maxWidth: '100%',
            height: isPortrait ? '100%' : 'auto',
            width: isPortrait ? 'auto' : '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
          }}
        >
          <Renderer design={design} svgRef={svgRef} />
          <div
            data-ruler-top
            role="button"
            tabIndex={0}
            aria-label="Add vertical guide"
            onPointerDown={e => startGuideDrag('x', e)}
            onKeyDown={e => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              addCenteredGuide('x')
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: -18,
              width: '100%',
              height: 14,
              border: '1px solid #18181b',
              background: '#ffffff',
              backgroundImage: 'repeating-linear-gradient(to right, #18181b 0 1px, transparent 1px 24px)',
              pointerEvents: 'all',
            }}
          />
          <div
            data-ruler-left
            role="button"
            tabIndex={0}
            aria-label="Add horizontal guide"
            onPointerDown={e => startGuideDrag('y', e)}
            onKeyDown={e => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              addCenteredGuide('y')
            }}
            style={{
              position: 'absolute',
              left: -18,
              top: 0,
              width: 14,
              height: '100%',
              border: '1px solid #18181b',
              background: '#ffffff',
              backgroundImage: 'repeating-linear-gradient(to bottom, #18181b 0 1px, transparent 1px 24px)',
              pointerEvents: 'all',
            }}
          />
          <ComposerOverlay scale={scale} zoom={zoom} snap={snap} />
          <div
            data-guide-layer
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: c.w,
              height: c.h,
              transform: `scale(${guideLayerScale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              zIndex: 70,
            }}
          >
            {guideLayerGuides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.pos}-${index}${index === guides.length ? '-draft' : ''}`}
                data-user-guide
                aria-hidden
                style={{
                  position: 'absolute',
                  left: guide.axis === 'x' ? guide.pos : 0,
                  top: guide.axis === 'y' ? guide.pos : 0,
                  width: guide.axis === 'x' ? guideLineWidth : c.w,
                  height: guide.axis === 'y' ? guideLineWidth : c.h,
                  background: draftGuide && index === guides.length ? '#ec4899' : '#2354d8',
                  opacity: draftGuide && index === guides.length ? 0.9 : 0.75,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </div>
          <div
            data-guide-handles
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: c.w,
              height: c.h,
              transform: `scale(${guideLayerScale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              zIndex: 90,
            }}
          >
            {guides.map((guide, index) => {
              const vertical = guide.axis === 'x'
              return (
                <button
                  key={`${guide.axis}-${guide.pos}-${index}`}
                  type="button"
                  data-guide-handle
                  aria-label={`Remove ${vertical ? 'vertical' : 'horizontal'} guide at ${guide.pos}`}
                  title="Remove guide"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation()
                    removeGuide(index)
                  }}
                  style={{
                    position: 'absolute',
                    left: vertical ? guide.pos - guideHandleSize / 2 : -guideHandleSize - guideHandleGap,
                    top: vertical ? -guideHandleSize - guideHandleGap : guide.pos - guideHandleSize / 2,
                    width: guideHandleSize,
                    height: guideHandleSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    background: '#ffffff',
                    border: `${guideHandleBorder}px solid #18181b`,
                    borderRadius: 0,
                    boxShadow: `${guideHandleShadow}px ${guideHandleShadow}px 0 0 #18181b`,
                    color: '#18181b',
                    cursor: 'pointer',
                    pointerEvents: 'all',
                  }}
                >
                  <XIcon aria-hidden size={12 / safeScale} strokeWidth={3} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <GrainAnimator svgRef={svgRef} enabled={design.style.filmGrain} />
      {/* Zoom HUD — bottom left corner of stage */}
      <ZoomHUD />
    </div>
  )
}

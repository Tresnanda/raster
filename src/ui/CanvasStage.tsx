import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { FreeOverlay } from './FreeOverlay'

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
        {design.mode === 'free' && <FreeOverlay scale={scale} />}
      </div>
    </div>
  )
}

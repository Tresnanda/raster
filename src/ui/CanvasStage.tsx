import type React from 'react'
import { Renderer } from '../render/Renderer'
import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'

export function CanvasStage({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const c = canvasFor(design.format)
  // Letterbox: preserve aspect ratio; fit entirely within available space
  const isPortrait = c.h >= c.w
  return (
    <div className="flex h-full items-center justify-center bg-neutral-200 p-8">
      <div
        className="shadow-2xl"
        style={{
          aspectRatio: `${c.w}/${c.h}`,
          maxHeight: '100%',
          maxWidth: '100%',
          height: isPortrait ? '100%' : 'auto',
          width: isPortrait ? 'auto' : '100%',
        }}
      >
        <Renderer design={design} svgRef={svgRef} />
      </div>
    </div>
  )
}

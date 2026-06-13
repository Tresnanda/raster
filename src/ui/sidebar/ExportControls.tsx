// src/ui/sidebar/ExportControls.tsx
import type React from 'react'
import { useDesign } from '../../store/useDesign'
import { exportRaster, exportSvg } from '../../export/useExport'

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ExportControls({ svgRef }: ExportControlsProps) {
  const design = useDesign(s => s.design)
  const name = `raster-${design.layout}`

  const run = (fn: (el: SVGSVGElement) => void) => {
    if (svgRef.current) fn(svgRef.current)
  }

  return (
    <div className="sb-section flex gap-2">
      <button
        onClick={() => run(el => exportRaster(el, design, name, 'image/png'))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        PNG
      </button>
      <button
        onClick={() => run(el => exportRaster(el, design, name, 'image/jpeg'))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        JPG
      </button>
      <button
        onClick={() => run(el => exportSvg(el, name))}
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
      >
        SVG
      </button>
    </div>
  )
}

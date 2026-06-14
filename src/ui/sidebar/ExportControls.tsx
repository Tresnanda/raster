// src/ui/sidebar/ExportControls.tsx
import type React from 'react'
import { useDesign } from '../../store/useDesign'
import { exportRaster, exportSvg } from '../../export/useExport'
import { Button } from '../../components/ui/button'

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => run(el => exportRaster(el, design, name, 'image/png'))}
        className="flex-1"
      >
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run(el => exportRaster(el, design, name, 'image/jpeg'))}
        className="flex-1"
      >
        JPG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run(el => exportSvg(el, name))}
        className="flex-1"
      >
        SVG
      </Button>
    </div>
  )
}

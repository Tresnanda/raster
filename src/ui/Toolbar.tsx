import type React from 'react'
import { useDesign } from '../store/useDesign'
import { Button } from './components/button'
import { exportRaster, exportSvg } from '../export/useExport'

export function Toolbar({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const design = useDesign(s => s.design)
  const shuffle = useDesign(s => s.shuffle)
  const setMode = useDesign(s => s.setMode)
  const name = `raster-${design.archetype}-${design.seed}`
  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 bg-white p-3">
      <Button onClick={shuffle}>Shuffle</Button>
      <Button
        variant={design.mode === 'free' ? 'default' : 'outline'}
        onClick={() => setMode(design.mode === 'free' ? 'grid' : 'free')}
      >
        {design.mode === 'free' ? 'Free' : 'Grid'}
      </Button>
      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          onClick={() => svgRef.current && exportRaster(svgRef.current, design, name, 'image/png')}
        >
          PNG
        </Button>
        <Button
          variant="outline"
          onClick={() => svgRef.current && exportRaster(svgRef.current, design, name, 'image/jpeg')}
        >
          JPG
        </Button>
        <Button
          variant="outline"
          onClick={() => svgRef.current && exportSvg(svgRef.current, name)}
        >
          SVG
        </Button>
      </div>
    </div>
  )
}

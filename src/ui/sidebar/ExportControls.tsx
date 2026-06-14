// src/ui/sidebar/ExportControls.tsx
import type React from 'react'
import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { exportRaster, exportSvg } from '../../export/useExport'
import { buildShareUrl } from '../../design/share'
import { Button } from '../../components/ui/button'

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ExportControls({ svgRef }: ExportControlsProps) {
  const design = useDesign(s => s.design)
  const name = `raster-${design.layout}`
  const [copied, setCopied] = useState(false)

  const run = (fn: (el: SVGSVGElement) => void) => {
    if (svgRef.current) fn(svgRef.current)
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(design))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="sb-section space-y-2">
      <div className="flex gap-2">
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

      <Button
        variant="outline"
        size="sm"
        onClick={copyShareLink}
        className="w-full"
        aria-label="Copy share link"
      >
        {copied ? <Check size={13} strokeWidth={2.5} /> : <Link2 size={13} strokeWidth={2} />}
        {copied ? 'Link copied' : 'Copy share link'}
      </Button>

      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Shares layout, type & style via the link. Uploaded images aren't included
        (no server) — paste-URL images are.
      </p>
    </div>
  )
}

// src/ui/sidebar/ExportControls.tsx
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link2, Check, Package, Loader2 } from 'lucide-react'
import { SlotText } from 'slot-text/react'
import { useDesign } from '../../store/useDesign'
import { exportRaster, exportSvg } from '../../export/useExport'
import { exportKit } from '../../export/kit'
import { buildShareUrl } from '../../design/share'
import { copyTextToClipboard } from '../../lib/clipboard'
import { Button } from '../../components/ui/button'

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ExportControls({ svgRef }: ExportControlsProps) {
  const design = useDesign(s => s.design)
  const name = `raster-${design.layout}`
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [manualShareUrl, setManualShareUrl] = useState('')
  const [kitBusy, setKitBusy] = useState(false)
  const manualShareRef = useRef<HTMLInputElement>(null)
  const copied = copyState === 'copied'
  const copyLabel = copied ? 'Link copied' : copyState === 'failed' ? 'Copy failed' : 'Copy share link'

  useEffect(() => {
    if (copyState === 'failed') manualShareRef.current?.select()
  }, [copyState])

  const runKit = async () => {
    if (kitBusy) return
    setKitBusy(true)
    try { await exportKit(design) } finally { setKitBusy(false) }
  }

  const run = (fn: (el: SVGSVGElement) => void) => {
    if (svgRef.current) fn(svgRef.current)
  }

  const copyShareLink = async () => {
    const shareUrl = buildShareUrl(design)
    const ok = await copyTextToClipboard(shareUrl)
    setManualShareUrl(ok ? '' : shareUrl)
    setCopyState(ok ? 'copied' : 'failed')
    if (ok) setTimeout(() => setCopyState('idle'), 1800)
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
        {/* slot-text (textmotion) rolls the label between states */}
        <SlotText text={copyLabel} />
      </Button>

      {copyState === 'failed' && (
        <input
          ref={manualShareRef}
          aria-label="Share link"
          readOnly
          value={manualShareUrl}
          onFocus={event => event.currentTarget.select()}
          className="w-full rounded-md border-2 border-foreground bg-background px-2 py-1 font-mono text-[10px] text-foreground outline-none focus:border-accent"
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={runKit}
        disabled={kitBusy}
        className="w-full"
        aria-label="Export social kit"
      >
        {kitBusy ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} strokeWidth={2} />}
        {kitBusy ? 'Building kit…' : 'Export kit (feed · square · story · poster)'}
      </Button>

      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Shares layout, type & style via the link. Uploaded images aren't included
        (no server) — paste-URL images are.
      </p>
    </div>
  )
}

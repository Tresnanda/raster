// src/ui/sidebar/SeriesControls.tsx — generate a matched poster set from a list
import { useState } from 'react'
import { Layers, Loader2 } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { parseSeriesItems } from '../../design/series'
import { exportSeries } from '../../export/series'
import { Button } from '../../components/ui/button'

export function SeriesControls() {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const items = parseSeriesItems(raw)

  const run = async () => {
    if (busy || items.length === 0) return
    setBusy(true)
    try {
      await exportSeries(useDesign.getState().design, items)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sb-section space-y-2">
      <textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={4}
        placeholder={'One per line, e.g.\nRun Melb\nWorld Wide Event\nChasing Horizons'}
        className="w-full resize-none rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-sans text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
      />
      <Button onClick={run} size="sm" className="w-full" disabled={busy || items.length === 0} aria-label="Export series">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} strokeWidth={2} />}
        {busy ? 'Building series…' : `Export series (${items.length})`}
      </Button>
      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Each line becomes a poster in this exact system — only the headline changes.
        Downloads as a zip.
      </p>
    </div>
  )
}

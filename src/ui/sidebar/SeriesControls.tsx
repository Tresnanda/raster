// src/ui/sidebar/SeriesControls.tsx — generate a matched poster set from a list
import { useState } from 'react'
import { FileStack, Layers, Loader2 } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { parseSeriesItems } from '../../design/series'
import { exportSeries } from '../../export/series'
import { Button } from '../../components/ui/button'

export function SeriesControls() {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const campaignItems = useDesign(s => s.campaignItems)
  const activeCampaignId = useDesign(s => s.activeCampaignId)
  const setCampaignRaw = useDesign(s => s.setCampaignRaw)
  const loadCampaignItem = useDesign(s => s.loadCampaignItem)
  const updateCampaignTitle = useDesign(s => s.updateCampaignTitle)
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

  const buildCampaign = () => {
    setCampaignRaw(raw)
  }

  return (
    <div className="sb-section space-y-3">
      <textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={4}
        placeholder={'One per line, e.g.\nRun Melb\nWorld Wide Event\nChasing Horizons'}
        className="w-full resize-none rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-sans text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={buildCampaign} size="sm" variant="outline" disabled={items.length === 0} aria-label="Build campaign">
          <FileStack size={13} strokeWidth={2} />
          Build
        </Button>
        <Button onClick={run} size="sm" disabled={busy || items.length === 0} aria-label="Export series">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} strokeWidth={2} />}
          {busy ? 'Zip…' : `Export (${items.length})`}
        </Button>
      </div>

      {campaignItems.length > 0 && (
        <div className="space-y-1.5">
          {campaignItems.map(item => (
            <div
              key={item.id}
              className={[
                'grid grid-cols-[1fr_auto] gap-1.5 rounded-md border-2 p-1.5',
                activeCampaignId === item.id ? 'border-accent bg-accent/10' : 'border-foreground bg-card',
              ].join(' ')}
            >
              <input
                value={item.title}
                onChange={e => updateCampaignTitle(item.id, e.target.value)}
                aria-label={`Campaign title ${item.title}`}
                className="min-w-0 bg-transparent px-1 font-sans text-[11px] font-medium text-foreground outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadCampaignItem(item.id)}
                aria-label={`Load ${item.title}`}
                className="h-7 px-2 text-[10px]"
              >
                Load
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Build makes an editable campaign board. Export downloads the current list as a matched zip.
      </p>
    </div>
  )
}

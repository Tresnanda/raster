import { Activity, Wand2 } from 'lucide-react'
import { useMemo } from 'react'
import { buildGridCoachReport, type CoachFixId } from '../../design/grid-coach'
import { useDesign } from '../../store/useDesign'
import { Button } from '../../components/ui/button'

const FIX_LABELS: Record<CoachFixId, string> = {
  'increase-contrast': 'Increase contrast',
  'left-align-type': 'Left align type',
  'tighten-hierarchy': 'Tighten hierarchy',
  'reduce-density': 'Reduce density',
}

export function GridCoachControls() {
  const design = useDesign(s => s.design)
  const applyCoachFix = useDesign(s => s.applyCoachFix)
  const report = useMemo(() => buildGridCoachReport(design), [design])
  const fixes = report.findings.filter(finding => finding.fixId)

  return (
    <div className="sb-section space-y-3">
      <div className="flex items-center justify-between rounded-md border-2 border-foreground bg-card px-2.5 py-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" strokeWidth={2.25} />
          <span className="font-sans text-xs font-semibold text-foreground">Swiss score</span>
        </div>
        <span className="font-mono text-sm font-bold text-foreground">{report.score}</span>
      </div>

      <div className="space-y-1.5">
        {report.findings.slice(0, 4).map((finding, index) => (
          <p key={`${finding.kind}-${index}`} className="font-sans text-[10px] leading-relaxed text-muted-foreground">
            {finding.message}
          </p>
        ))}
      </div>

      {fixes.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5">
          {fixes.map(finding => (
            <Button
              key={`${finding.kind}-${finding.fixId}`}
              variant="outline"
              size="sm"
              onClick={() => applyCoachFix(finding.fixId!)}
              aria-label={FIX_LABELS[finding.fixId!]}
            >
              <Wand2 size={13} strokeWidth={2.25} />
              {FIX_LABELS[finding.fixId!]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

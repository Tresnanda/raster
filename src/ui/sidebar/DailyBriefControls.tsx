import { CalendarDays, Sparkles } from 'lucide-react'
import { dailyBriefForDate, todayKey } from '../../design/daily-briefs'
import { useDesign } from '../../store/useDesign'
import { Button } from '../../components/ui/button'

export function DailyBriefControls({ today = todayKey() }: { today?: string }) {
  const brief = dailyBriefForDate(today)
  const active = useDesign(s => s.dailyBrief)
  const applyDailyBrief = useDesign(s => s.applyDailyBrief)

  return (
    <div className="sb-section space-y-2">
      <div className="rounded-md border-2 border-foreground bg-card p-2.5">
        <div className="flex items-start gap-2">
          <CalendarDays size={14} className="mt-0.5 text-accent" strokeWidth={2.25} />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">{today}</p>
            <h3 className="font-sans text-xs font-semibold text-foreground">{brief.title}</h3>
            <p className="mt-1 font-sans text-[10px] leading-relaxed text-muted-foreground">{brief.prompt}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-1">
        {brief.constraints.map(item => (
          <li key={item} className="font-sans text-[10px] leading-tight text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
      <Button size="sm" className="w-full" onClick={() => applyDailyBrief(today)} aria-label="Start brief">
        <Sparkles size={13} strokeWidth={2.25} />
        {active?.date === today ? 'Restart brief' : 'Start brief'}
      </Button>
    </div>
  )
}

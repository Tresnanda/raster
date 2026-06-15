// src/ui/sidebar/MotionControls.tsx — kinetic text motion (textmotion)
import type React from 'react'
import { useState } from 'react'
import { Play, Film, Loader2 } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { MOTION_EFFECTS, motionSequenceDurationMs, playPosterMotion } from '../../design/motion'
import { exportVideo, isVideoExportSupported } from '../../export/video'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

interface MotionControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function MotionControls({ svgRef }: MotionControlsProps) {
  const effect = useDesign(s => s.motionEffect)
  const setEffect = useDesign(s => s.setMotionEffect)
  const sequence = useDesign(s => s.motionSequence)
  const setSequence = useDesign(s => s.setMotionSequence)
  const slotCount = useDesign(s => s.design.slots.length)
  const [recording, setRecording] = useState(false)

  const play = () => playPosterMotion(svgRef.current, sequence.effect, { sequence })

  const record = async () => {
    if (recording) return
    setRecording(true)
    try {
      await exportVideo(svgRef.current, useDesign.getState().design, sequence.effect, { sequence })
    } finally {
      setRecording(false)
    }
  }

  return (
    <div className="sb-section space-y-3">
      {/* Effect picker — compact wrap of preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {MOTION_EFFECTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setEffect(value)}
            className={cn(
              'rounded-md border-2 border-foreground px-2.5 py-1 text-[11px] font-medium',
              'transition-[transform,box-shadow,background-color,color] duration-100 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
              effect === value
                ? 'bg-foreground text-background'
                : 'bg-card text-muted-foreground hover:text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="font-sans text-[10px] font-medium text-muted-foreground">Tempo</span>
          <input
            aria-label="Tempo"
            type="number"
            min={25}
            max={200}
            value={sequence.tempo}
            onChange={e => setSequence({ tempo: Number(e.target.value) })}
            className="h-8 w-full rounded-md border-2 border-foreground bg-background px-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="font-sans text-[10px] font-medium text-muted-foreground">Delay</span>
          <input
            aria-label="Delay"
            type="number"
            min={0}
            max={2000}
            step={50}
            value={sequence.delayMs}
            onChange={e => setSequence({ delayMs: Number(e.target.value) })}
            className="h-8 w-full rounded-md border-2 border-foreground bg-background px-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="font-sans text-[10px] font-medium text-muted-foreground">Stagger</span>
          <input
            aria-label="Stagger"
            type="number"
            min={0}
            max={300}
            step={10}
            value={sequence.staggerMs}
            onChange={e => setSequence({ staggerMs: Number(e.target.value) })}
            className="h-8 w-full rounded-md border-2 border-foreground bg-background px-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex items-center justify-between rounded-md border-2 border-foreground bg-card px-2.5 py-1.5">
        <span className="font-sans text-[11px] font-medium text-foreground">Loop preview</span>
        <input
          aria-label="Loop preview"
          type="checkbox"
          checked={sequence.loop}
          onChange={e => setSequence({ loop: e.target.checked })}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </label>

      <div className="flex gap-2">
        <Button onClick={play} variant="outline" size="sm" className="flex-1" aria-label="Play text animation">
          <Play size={13} strokeWidth={2.25} />
          Play
        </Button>
        {isVideoExportSupported() && (
          <Button onClick={record} size="sm" className="flex-1" disabled={recording} aria-label="Export animated video">
            {recording ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} strokeWidth={2} />}
            {recording ? 'Recording…' : 'Export video'}
          </Button>
        )}
      </div>

      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        {Math.round(motionSequenceDurationMs(sequence, slotCount) / 100) / 10}s motion loop. Export video records it to a WebM clip.
      </p>
    </div>
  )
}

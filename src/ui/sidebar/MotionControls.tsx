// src/ui/sidebar/MotionControls.tsx — kinetic text motion (textmotion)
import type React from 'react'
import { useState } from 'react'
import { Play, Film, Loader2 } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { MOTION_EFFECTS, playPosterMotion } from '../../design/motion'
import { exportVideo, isVideoExportSupported } from '../../export/video'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

interface MotionControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function MotionControls({ svgRef }: MotionControlsProps) {
  const effect = useDesign(s => s.motionEffect)
  const setEffect = useDesign(s => s.setMotionEffect)
  const [recording, setRecording] = useState(false)

  const play = () => playPosterMotion(svgRef.current, effect)

  const record = async () => {
    if (recording) return
    setRecording(true)
    try {
      await exportVideo(svgRef.current, useDesign.getState().design, effect)
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
        Play previews the motion. Export video records it to a WebM clip you can post.
      </p>
    </div>
  )
}

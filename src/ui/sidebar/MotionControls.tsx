// src/ui/sidebar/MotionControls.tsx — kinetic text motion (textmotion)
import type React from 'react'
import { Play } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { MOTION_EFFECTS, playPosterMotion } from '../../design/motion'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

interface MotionControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function MotionControls({ svgRef }: MotionControlsProps) {
  const effect = useDesign(s => s.motionEffect)
  const setEffect = useDesign(s => s.setMotionEffect)

  const play = () => playPosterMotion(svgRef.current, effect)

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

      <Button onClick={play} size="sm" className="w-full" aria-label="Play text animation">
        <Play size={13} strokeWidth={2.25} />
        Play motion
      </Button>

      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Animates the poster type. Video export is coming next — this is the preview.
      </p>
    </div>
  )
}

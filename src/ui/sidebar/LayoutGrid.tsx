// src/ui/sidebar/LayoutGrid.tsx
import { useRef } from 'react'
import { Shuffle, Dices, Sparkles, Wand2 } from 'lucide-react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffleAction = useDesign(s => s.shuffle)
  const pickForMeAction = useDesign(s => s.pickForMe)
  const surpriseAction = useDesign(s => s.surprise)
  const openRiff = useDesign(s => s.openRiff)

  const shuffleIconRef = useRef<HTMLSpanElement>(null)
  const surpriseIconRef = useRef<HTMLSpanElement>(null)
  const riffIconRef = useRef<HTMLSpanElement>(null)

  function handleShuffle() {
    shuffleAction()
    const icon = shuffleIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    gsap.fromTo(icon, { x: -3 }, { x: 0, duration: 0.2, ease: 'power3.out' })
  }

  function handleSurprise() {
    surpriseAction()
    const icon = surpriseIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    gsap.from(icon, {
      rotation: -30,
      scale: 0.8,
      duration: 0.3,
      ease: 'power3.out',
      transformOrigin: '50% 50%',
    })
  }

  function handleRiff() {
    openRiff()
    const icon = riffIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    gsap.from(icon, {
      scale: 0.7,
      rotation: 20,
      duration: 0.35,
      ease: 'back.out(2)',
      transformOrigin: '50% 50%',
    })
  }

  return (
    <div className="sb-section space-y-3">
      {/* Layout grid — 5 cols, cells aspect-[3/4], min-w-0 prevents overflow */}
      <div className="grid grid-cols-5 gap-2 min-w-0">
        {LAYOUTS.map(({ n }) => (
          <button
            key={n}
            onClick={() => setLayout(n)}
            className={cn(
              'aspect-[3/4] rounded-md border text-sm flex items-center justify-center min-w-0',
              'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              layout === n
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-foreground/40 hover:-translate-y-px hover:shadow-sm',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Generation buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {/* Shuffle — outline */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffle}
            title="Rearrange this layout"
            className="flex-1"
          >
            <span ref={shuffleIconRef} style={{ display: 'contents' }}>
              <Shuffle size={14} />
            </span>
            Shuffle
          </Button>

          {/* Pick for me — outline */}
          <Button
            variant="outline"
            size="sm"
            onClick={pickForMeAction}
            title="Jump to a random preset layout"
            className="flex-1"
          >
            <Dices size={14} />
            Pick
          </Button>
        </div>

        <div className="flex gap-1.5">
          {/* Surprise — primary filled */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSurprise}
            title="Generate a brand-new unique design"
            className="flex-1 bg-neutral-900 hover:bg-neutral-800"
          >
            <span ref={surpriseIconRef} style={{ display: 'contents' }}>
              <Sparkles size={14} />
            </span>
            Surprise
          </Button>

          {/* Riff — violet accent */}
          <Button
            size="sm"
            onClick={handleRiff}
            title="Open variation explorer — mutate and evolve the current design"
            data-testid="riff-button"
            className="flex-1 border border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:border-violet-700"
          >
            <span ref={riffIconRef} style={{ display: 'contents' }}>
              <Wand2 size={14} />
            </span>
            Riff
          </Button>
        </div>
      </div>

      {/* Microcopy */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Shuffle reworks this layout · Pick jumps to a preset · Surprise invents a new one · Riff mutates and evolves.
      </p>
    </div>
  )
}

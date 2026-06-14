// src/ui/sidebar/LayoutGrid.tsx — Ink Brutalism
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
      {/* Layout grid — 5 cols, cells aspect-[3/4] */}
      <div className="grid grid-cols-5 gap-0 border-2 border-foreground min-w-0 overflow-hidden">
        {LAYOUTS.map(({ n }, idx) => (
          <button
            key={n}
            onClick={() => setLayout(n)}
            className={cn(
              'aspect-[3/4] flex items-center justify-center min-w-0',
              'font-mono text-xs font-bold tabular-nums',
              'transition-colors duration-100',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:z-10',
              // Right border for all but last in row — grid of 5, handle with nth logic
              idx % 5 !== 4 ? 'border-r-2 border-foreground' : '',
              // Bottom border for first row (indices 0-4)
              idx < 5 ? 'border-b-2 border-foreground' : '',
              layout === n
                ? 'bg-foreground text-background'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Generation buttons — 2x2 brutal grid */}
      <div className="grid grid-cols-2 gap-0 border-2 border-foreground overflow-hidden">
        {/* Shuffle — outline brutal */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShuffle}
          title="Rearrange this layout"
          className="rounded-none border-0 border-r-2 border-b-2 border-foreground bg-background text-foreground shadow-none hover:bg-muted"
        >
          <span ref={shuffleIconRef} style={{ display: 'contents' }}>
            <Shuffle size={12} />
          </span>
          Shuffle
        </Button>

        {/* Pick for me — outline brutal */}
        <Button
          variant="ghost"
          size="sm"
          onClick={pickForMeAction}
          title="Jump to a random preset layout"
          className="rounded-none border-0 border-b-2 border-foreground bg-background text-foreground shadow-none hover:bg-muted"
        >
          <Dices size={12} />
          Pick
        </Button>

        {/* Surprise — solid ink block */}
        <Button
          variant="default"
          size="sm"
          onClick={handleSurprise}
          title="Generate a brand-new unique design"
          className="rounded-none border-0 border-r-2 border-foreground shadow-none hover:opacity-80 active:translate-x-0 active:translate-y-0"
        >
          <span ref={surpriseIconRef} style={{ display: 'contents' }}>
            <Sparkles size={12} />
          </span>
          Surprise
        </Button>

        {/* Riff — hazard red accent */}
        <Button
          size="sm"
          onClick={handleRiff}
          title="Open variation explorer — mutate and evolve the current design"
          data-testid="riff-button"
          className="rounded-none border-0 shadow-none bg-accent text-accent-foreground hover:opacity-80 active:translate-x-0 active:translate-y-0"
        >
          <span ref={riffIconRef} style={{ display: 'contents' }}>
            <Wand2 size={12} />
          </span>
          Riff
        </Button>
      </div>

      {/* Microcopy */}
      <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground leading-relaxed">
        Shuffle reworks · Pick jumps preset · Surprise invents · Riff mutates.
      </p>
    </div>
  )
}

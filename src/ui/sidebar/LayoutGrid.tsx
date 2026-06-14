// src/ui/sidebar/LayoutGrid.tsx — Neo-brutalist
import { useRef } from 'react'
import { Shuffle, Grid2x2, Asterisk, GitBranch } from 'lucide-react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffleAction = useDesign(s => s.shuffle)
  const shuffleScope = useDesign(s => s.shuffleScope)
  const setShuffleScope = useDesign(s => s.setShuffleScope)
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
      {/* Layout grid — clean individual carded cells (gap-separated, each fully
          bordered) so the ragged last row never breaks the border lattice. */}
      <div className="grid grid-cols-5 gap-1.5 min-w-0">
        {LAYOUTS.map(({ n }) => (
          <button
            key={n}
            onClick={() => setLayout(n)}
            className={cn(
              'aspect-[3/4] flex items-center justify-center min-w-0 rounded-md border-2 border-foreground',
              'font-mono text-xs tabular-nums',
              'transition-[transform,box-shadow,background-color,color] duration-100 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:z-10',
              layout === n
                ? 'bg-foreground text-background font-bold shadow-[2px_2px_0_0_var(--foreground)]'
                : 'bg-card text-muted-foreground hover:-translate-y-px hover:text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)]',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Shuffle scope">
        {(
          [
            { value: 'all', label: 'All' },
            { value: 'content', label: 'Copy' },
            { value: 'system', label: 'System' },
          ] as const
        ).map(scope => (
          <button
            key={scope.value}
            type="button"
            onClick={() => setShuffleScope(scope.value)}
            aria-label={`${scope.label} scope`}
            className={cn(
              'h-7 rounded-md border-2 border-foreground px-2 font-sans text-[10px] font-semibold',
              'transition-[transform,box-shadow,background-color,color] duration-100 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
              shuffleScope === scope.value
                ? 'bg-foreground text-background shadow-[2px_2px_0_0_var(--foreground)]'
                : 'bg-card text-muted-foreground hover:-translate-y-px hover:text-foreground hover:shadow-[2px_2px_0_0_var(--foreground)]',
            )}
          >
            {scope.label}
          </button>
        ))}
      </div>

      {/* Generation buttons — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Shuffle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          title="Rearrange this layout"
        >
          <span ref={shuffleIconRef} style={{ display: 'contents' }}>
            <Shuffle size={12} />
          </span>
          Shuffle
        </Button>

        {/* Pick for me */}
        <Button
          variant="outline"
          size="sm"
          onClick={pickForMeAction}
          title="Jump to a random preset layout"
        >
          <Grid2x2 size={12} strokeWidth={2} />
          Pick
        </Button>

        {/* Surprise — solid ink */}
        <Button
          variant="default"
          size="sm"
          onClick={handleSurprise}
          title="Generate a brand-new unique design"
        >
          <span ref={surpriseIconRef} style={{ display: 'contents' }}>
            <Asterisk size={13} strokeWidth={2.25} />
          </span>
          Surprise
        </Button>

        {/* Riff — accent red */}
        <Button
          size="sm"
          onClick={handleRiff}
          title="Open variation explorer — mutate and evolve the current design"
          data-testid="riff-button"
          className="bg-accent text-accent-foreground border-accent shadow-brutal hover:shadow-brutal-lg hover:-translate-y-px active:shadow-none"
        >
          <span ref={riffIconRef} style={{ display: 'contents' }}>
            <GitBranch size={12} strokeWidth={2} />
          </span>
          Riff
        </Button>
      </div>

      {/* Microcopy */}
      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        Shuffle reworks · Pick jumps preset · Surprise invents · Riff mutates.
      </p>
    </div>
  )
}

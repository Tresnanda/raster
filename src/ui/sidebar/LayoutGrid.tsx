// src/ui/sidebar/LayoutGrid.tsx
import { useRef } from 'react'
import { Shuffle, Dices, Sparkles, Wand2 } from 'lucide-react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

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

  const baseBtn =
    'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ' +
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ' +
    'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10'

  return (
    <div className="sb-section space-y-3">
      {/* Layout grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
      >
        {LAYOUTS.map(({ n }) => (
          <button
            key={n}
            onClick={() => setLayout(n)}
            className={[
              'aspect-[3/4] rounded-md border text-sm flex items-center justify-center',
              'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'active:scale-[0.97]',
              layout === n
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:-translate-y-px hover:shadow-sm',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Generation buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {/* Shuffle — outline */}
          <button
            onClick={handleShuffle}
            title="Rearrange this layout"
            className={[baseBtn, 'flex-1 border border-neutral-200 text-neutral-700 hover:border-neutral-400'].join(' ')}
          >
            <span ref={shuffleIconRef} style={{ display: 'contents' }}>
              <Shuffle size={14} />
            </span>
            Shuffle
          </button>

          {/* Pick for me — outline */}
          <button
            onClick={pickForMeAction}
            title="Jump to a random preset layout"
            className={[baseBtn, 'flex-1 border border-neutral-200 text-neutral-700 hover:border-neutral-400'].join(' ')}
          >
            <Dices size={14} />
            Pick
          </button>
        </div>

        <div className="flex gap-1.5">
          {/* Surprise — primary filled */}
          <button
            onClick={handleSurprise}
            title="Generate a brand-new unique design"
            className={[
              baseBtn,
              'flex-1 border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-800',
            ].join(' ')}
          >
            <span ref={surpriseIconRef} style={{ display: 'contents' }}>
              <Sparkles size={14} />
            </span>
            Surprise
          </button>

          {/* Riff — accent filled */}
          <button
            onClick={handleRiff}
            title="Open variation explorer — mutate and evolve the current design"
            data-testid="riff-button"
            className={[
              baseBtn,
              'flex-1 border border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:border-violet-700',
            ].join(' ')}
          >
            <span ref={riffIconRef} style={{ display: 'contents' }}>
              <Wand2 size={14} />
            </span>
            Riff
          </button>
        </div>
      </div>

      {/* Microcopy */}
      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Shuffle reworks this layout · Pick jumps to a preset · Surprise invents a new one · Riff mutates and evolves.
      </p>
    </div>
  )
}

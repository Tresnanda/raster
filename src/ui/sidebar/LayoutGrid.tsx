// src/ui/sidebar/LayoutGrid.tsx
import { useRef } from 'react'
import gsap from 'gsap'
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffleAction = useDesign(s => s.shuffle)
  const surpriseAction = useDesign(s => s.surprise)

  const shuffleIconRef = useRef<HTMLSpanElement>(null)
  const surpriseIconRef = useRef<HTMLSpanElement>(null)

  function handleShuffle() {
    shuffleAction()
    const icon = shuffleIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    // Quick horizontal nudge: left -3px then back
    gsap.fromTo(icon, { x: -3 }, { x: 0, duration: 0.2, ease: 'power3.out' })
  }

  function handleSurprise() {
    surpriseAction()
    const icon = surpriseIconRef.current
    if (!icon) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    // Snap-in from slight negative rotation + scale — one-shot, 300ms
    gsap.from(icon, {
      rotation: -30,
      scale: 0.8,
      duration: 0.3,
      ease: 'power3.out',
      transformOrigin: '50% 50%',
    })
  }

  return (
    <div className="sb-section space-y-3">
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
              'transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
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
      <div className="flex gap-2">
        <button
          onClick={handleShuffle}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          <span ref={shuffleIconRef} style={{ display: 'inline-block' }}>⇄</span>{' '}Shuffle
        </button>
        <button
          onClick={handleSurprise}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          <span ref={surpriseIconRef} style={{ display: 'inline-block' }}>✦</span>{' '}Surprise
        </button>
      </div>
    </div>
  )
}

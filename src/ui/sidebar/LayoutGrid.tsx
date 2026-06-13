// src/ui/sidebar/LayoutGrid.tsx
import { useDesign } from '../../store/useDesign'
import { LAYOUTS } from '../../design/layouts'

export function LayoutGrid() {
  const layout = useDesign(s => s.design.layout)
  const setLayout = useDesign(s => s.setLayout)
  const shuffle = useDesign(s => s.shuffle)
  const surprise = useDesign(s => s.surprise)

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
          onClick={shuffle}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          ⇄ Shuffle
        </button>
        <button
          onClick={surprise}
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-neutral-400 active:scale-[0.97]"
        >
          ✦ Surprise
        </button>
      </div>
    </div>
  )
}

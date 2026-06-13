// src/ui/BottomBar.tsx
import { useDesign } from '../store/useDesign'
import { LAYOUTS } from '../design/layouts'

export function BottomBar() {
  const design = useDesign(s => s.design)
  const prevLayout = useDesign(s => s.prevLayout)
  const nextLayout = useDesign(s => s.nextLayout)
  const setMode = useDesign(s => s.setMode)

  const layoutDef = LAYOUTS.find(l => l.n === design.layout)
  const layoutName = layoutDef?.name ?? ''

  return (
    <div className="border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between text-sm">
      <div className="text-neutral-500">
        Layout{' '}
        <span className="font-semibold tabular-nums text-neutral-900">{design.layout}</span>
        {' — '}
        <span className="text-neutral-700">{layoutName}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode(design.mode === 'free' ? 'grid' : 'free')}
          className={[
            'rounded border px-2.5 py-1 text-xs font-medium',
            design.mode === 'free'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400',
          ].join(' ')}
        >
          {design.mode === 'free' ? 'Free ✕' : 'Free'}
        </button>

        <div className="flex gap-1">
          <button
            onClick={prevLayout}
            className="rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 active:scale-[0.97] transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
          >
            ← Prev
          </button>
          <button
            onClick={nextLayout}
            className="rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 active:scale-[0.97] transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

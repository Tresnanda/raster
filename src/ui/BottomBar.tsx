// src/ui/BottomBar.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { LAYOUTS } from '../design/layouts'

export function BottomBar() {
  const design = useDesign(s => s.design)
  const prevLayout = useDesign(s => s.prevLayout)
  const nextLayout = useDesign(s => s.nextLayout)

  const layoutDef = LAYOUTS.find(l => l.n === design.layout)

  const btnCls = [
    'flex items-center gap-1 rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700',
    'hover:border-neutral-400 hover:-translate-y-px',
    'active:scale-[0.97]',
    'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  ].join(' ')

  return (
    <div className="border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between text-sm">
      <div className="tabular-nums text-neutral-500">
        <span className="font-semibold text-neutral-900">
          {design.layout === 0 ? 'Generated' : `Layout ${design.layout}`}
        </span>
        {design.layout === 0 ? (
          <span className="text-neutral-400"> — unique</span>
        ) : layoutDef ? (
          <span className="text-neutral-400"> — {layoutDef.name}</span>
        ) : null}
      </div>

      <div className="flex gap-1">
        <button onClick={prevLayout} className={btnCls} aria-label="Previous layout">
          <ChevronLeft size={14} />
          Prev
        </button>
        <button onClick={nextLayout} className={btnCls} aria-label="Next layout">
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

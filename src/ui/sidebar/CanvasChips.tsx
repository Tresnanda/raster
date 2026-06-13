// src/ui/sidebar/CanvasChips.tsx
import type { Format } from '../../types'
import { useDesign } from '../../store/useDesign'

const FORMAT_ORDER: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CanvasChips() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)

  return (
    <div className="sb-section">
      <div
        role="radiogroup"
        aria-label="Canvas format"
        className="inline-flex flex-wrap gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 p-0.5"
      >
        {FORMAT_ORDER.map(f => (
          <button
            key={f}
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            className={[
              'rounded-md px-2.5 py-1 text-xs font-semibold',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20',
              'active:scale-[0.97] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              format === f
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}

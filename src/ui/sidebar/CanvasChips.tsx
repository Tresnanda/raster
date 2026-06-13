// src/ui/sidebar/CanvasChips.tsx
import type { Format } from '../../types'
import { useDesign } from '../../store/useDesign'

const FORMAT_ORDER: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CanvasChips() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)

  return (
    <div className="sb-section flex flex-wrap gap-1.5">
      {FORMAT_ORDER.map(f => (
        <button
          key={f}
          onClick={() => setFormat(f)}
          className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            'transition-colors duration-[160ms]',
            format === f
              ? 'bg-neutral-900 text-white'
              : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400',
          ].join(' ')}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

// src/ui/sidebar/StyleControls.tsx
import { useDesign } from '../../store/useDesign'
import { PRESET_PALETTES } from '../../design/palettes'

export function StyleControls() {
  const palette = useDesign(s => s.design.palette)
  const style = useDesign(s => s.design.style)
  const setPalette = useDesign(s => s.setPalette)
  const setAccent = useDesign(s => s.setAccent)
  const setStyle = useDesign(s => s.setStyle)

  const isSelectedPalette = (p: { bg: string; text: string; accent: string }) =>
    p.bg === palette.bg && p.text === palette.text && p.accent === palette.accent

  return (
    <div className="sb-section space-y-4">
      {/* Palette swatches */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Palette
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PALETTES.map(p => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => setPalette({ ...p.palette })}
              className={[
                'h-8 w-8 rounded-md border overflow-hidden relative',
                'transition-transform duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'active:scale-[0.97]',
                isSelectedPalette(p.palette)
                  ? 'ring-2 ring-neutral-900 ring-offset-1'
                  : 'border-neutral-200 hover:border-neutral-400',
              ].join(' ')}
              style={{ background: p.palette.bg }}
            >
              <span
                className="absolute bottom-1 right-1 block h-2 w-2 rounded-sm"
                style={{ background: p.palette.accent }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour picker */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="sc-accent"
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Accent colour
        </label>
        <input
          id="sc-accent"
          type="color"
          value={palette.accent}
          onChange={e => setAccent(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {(
          [
            { key: 'accentHeadline', label: 'Accent the headline' },
            { key: 'bwImage', label: 'Black & white image' },
            { key: 'filmGrain', label: 'Film grain' },
            { key: 'gridOverlay', label: 'Show grid overlay' },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={style[key]}
              onChange={e => setStyle({ [key]: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}

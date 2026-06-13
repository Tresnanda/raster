// src/ui/sidebar/StyleControls.tsx
import { useRef } from 'react'
import { Check } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { PRESET_PALETTES } from '../../design/palettes'

interface CustomCheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function CustomCheckbox({ id, label, checked, onChange }: CustomCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 select-none"
    >
      {/* Hidden real input for a11y/keyboard */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        data-style-checkbox={id}
      />
      {/* Visual box */}
      <span
        aria-hidden="true"
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
          checked
            ? 'border-neutral-900 bg-neutral-900'
            : 'border-neutral-300 bg-white',
        ].join(' ')}
      >
        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )
}

export function StyleControls() {
  const palette = useDesign(s => s.design.palette)
  const style = useDesign(s => s.design.style)
  const setPalette = useDesign(s => s.setPalette)
  const setAccent = useDesign(s => s.setAccent)
  const setStyle = useDesign(s => s.setStyle)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const isSelectedPalette = (p: { bg: string; text: string; accent: string }) =>
    p.bg === palette.bg && p.text === palette.text && p.accent === palette.accent

  return (
    <div className="sb-section space-y-4">
      {/* Palette swatches */}
      <div className="space-y-1.5">
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
                'relative h-9 w-9 overflow-hidden rounded-lg border-2',
                'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'active:scale-[0.97]',
                isSelectedPalette(p.palette)
                  ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                  : 'border-neutral-200 hover:border-neutral-400',
              ].join(' ')}
              style={{ background: p.palette.bg }}
            >
              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 block h-2 w-2 rounded-sm"
                style={{ background: p.palette.accent }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour — styled swatch opens hidden color picker */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Accent
        </span>
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="h-7 w-12 rounded-md border-2 border-neutral-200 shadow-sm hover:border-neutral-400 transition-colors duration-150 active:scale-[0.97] transition-transform"
          style={{ background: palette.accent }}
          aria-label="Pick accent colour"
        />
        <input
          ref={colorInputRef}
          type="color"
          value={palette.accent}
          onChange={e => setAccent(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* Custom checkboxes */}
      <div className="space-y-2.5">
        {(
          [
            { key: 'accentHeadline', label: 'Accent the headline' },
            { key: 'bwImage', label: 'Black & white image' },
            { key: 'filmGrain', label: 'Film grain' },
            { key: 'gridOverlay', label: 'Show grid overlay' },
          ] as const
        ).map(({ key, label }) => (
          <CustomCheckbox
            key={key}
            id={`sc-${key}`}
            label={label}
            checked={style[key]}
            onChange={v => setStyle({ [key]: v })}
          />
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        Global defaults — select any element to override per-element style.
      </p>
    </div>
  )
}

// src/ui/sidebar/TypographyControls.tsx
import { useDesign } from '../../store/useDesign'
import { Slider } from '../components/slider'
import type { FontFamily } from '../../types'

const TYPEFACE_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'display', label: 'Archivo Display' },
  { value: 'sans', label: 'Inter' },
  { value: 'condensed', label: 'Archivo Narrow' },
  { value: 'mono', label: 'Space Mono' },
]

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-xs text-neutral-500">{label}</div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <div className="w-12 text-right text-xs tabular-nums text-neutral-600">
        {step < 0.01 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : value}
      </div>
    </div>
  )
}

export function TypographyControls() {
  const typography = useDesign(s => s.design.typography)
  const setTypography = useDesign(s => s.setTypography)

  return (
    <div className="sb-section space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="tc-typeface"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Typeface
        </label>
        <select
          id="tc-typeface"
          value={typography.typeface}
          onChange={e => setTypography({ typeface: e.target.value as FontFamily })}
          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        >
          {TYPEFACE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        <SliderRow
          label="Title"
          value={typography.title}
          min={40} max={320} step={1}
          onChange={v => setTypography({ title: v })}
        />
        <SliderRow
          label="Headline"
          value={typography.headline}
          min={40} max={400} step={1}
          onChange={v => setTypography({ headline: v })}
        />
        <SliderRow
          label="Body"
          value={typography.body}
          min={10} max={48} step={1}
          onChange={v => setTypography({ body: v })}
        />
        <SliderRow
          label="Tracking"
          value={typography.tracking}
          min={-0.1} max={0.1} step={0.005}
          onChange={v => setTypography({ tracking: v })}
        />
        <SliderRow
          label="Leading"
          value={typography.leading}
          min={0.8} max={1.6} step={0.01}
          onChange={v => setTypography({ leading: v })}
        />
      </div>

      <p className="text-xs text-neutral-400">
        Tracking and leading shape the display type (title + headline).
      </p>
    </div>
  )
}

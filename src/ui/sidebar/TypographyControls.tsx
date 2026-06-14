// src/ui/sidebar/TypographyControls.tsx
import { useDesign } from '../../store/useDesign'
import { Slider } from '../controls/Slider'
import { Select } from '../controls/Select'
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
      <div className="w-20 shrink-0 text-xs text-muted-foreground">{label}</div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="flex-1"
      />
      <div className="w-12 text-right text-xs tabular-nums text-foreground/70">
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
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          Typeface
        </label>
        <Select
          id="tc-typeface"
          value={typography.typeface}
          onValueChange={v => setTypography({ typeface: v as FontFamily })}
          options={TYPEFACE_OPTIONS}
          aria-label="Typeface"
        />
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

      <p className="text-xs text-muted-foreground">
        Global defaults — select any element to override it. Tracking and leading apply to title + headline.
      </p>
    </div>
  )
}

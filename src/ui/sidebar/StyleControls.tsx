// src/ui/sidebar/StyleControls.tsx
import { useRef, useState } from 'react'
import { Check, Pipette } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { PRESET_PALETTES } from '../../design/palettes'
import { paletteFromImageFile } from '../../design/palette-extract'
import type { Palette } from '../../types'
import { Checkbox } from '../controls/Checkbox'
import { Button } from '../../components/ui/button'
import { cn } from '@/lib/utils'

export function StyleControls() {
  const palette = useDesign(s => s.design.palette)
  const style = useDesign(s => s.design.style)
  const setPalette = useDesign(s => s.setPalette)
  const applyExtractedPalette = useDesign(s => s.applyExtractedPalette)
  const setAccent = useDesign(s => s.setAccent)
  const setStyle = useDesign(s => s.setStyle)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [extractedPalette, setExtractedPalette] = useState<Palette | null>(null)
  const [paletteError, setPaletteError] = useState<string | null>(null)

  const isSelectedPalette = (p: { bg: string; text: string; accent: string }) =>
    p.bg === palette.bg && p.text === palette.text && p.accent === palette.accent

  const handlePaletteFile = async (file?: File) => {
    if (!file) return
    try {
      const next = await paletteFromImageFile(file)
      setExtractedPalette(next)
      setPaletteError(null)
    } catch {
      setPaletteError('Could not read image palette.')
    }
  }

  return (
    <div className="sb-section space-y-4">
      {/* Palette swatches */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Palette
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PALETTES.map(p => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => setPalette({ ...p.palette })}
              className={cn(
                'relative h-9 w-9 overflow-hidden rounded-lg border-2',
                'transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                isSelectedPalette(p.palette)
                  ? 'border-foreground ring-2 ring-foreground ring-offset-2'
                  : 'border-border hover:border-foreground/40',
              )}
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

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Pull palette from image"
        >
          <Pipette size={13} strokeWidth={2.25} />
          Pull palette from image
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Palette image file"
          onChange={event => {
            void handlePaletteFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />
        {extractedPalette && (
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border-2 border-foreground">
              {[extractedPalette.bg, extractedPalette.text, extractedPalette.accent].map(color => (
                <span key={color} className="h-6 w-8" style={{ background: color }} />
              ))}
            </div>
            <Button
              type="button"
              variant="default"
              size="xs"
              onClick={() => applyExtractedPalette(extractedPalette)}
              aria-label="Apply extracted palette"
            >
              <Check size={12} strokeWidth={2.25} />
              Apply
            </Button>
          </div>
        )}
        {paletteError && (
          <p className="font-sans text-[10px] leading-relaxed text-destructive" role="status">
            {paletteError}
          </p>
        )}
      </div>

      {/* Accent colour — styled swatch opens hidden color picker */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Accent
        </span>
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="h-7 w-12 rounded-md border-2 border-border shadow-sm hover:border-foreground/40 transition-colors duration-150 active:scale-[0.97]"
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
          <Checkbox
            key={key}
            id={`sc-${key}`}
            label={label}
            checked={style[key]}
            onChange={v => setStyle({ [key]: v })}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Global defaults — select any element to override per-element style.
      </p>
    </div>
  )
}

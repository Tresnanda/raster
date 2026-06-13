import { useDesign } from '../store/useDesign'
import { PRESET_PALETTES } from '../design/palettes'

export function PalettePicker() {
  const palette = useDesign(s => s.design.palette)
  const setPalette = useDesign(s => s.setPalette)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_PALETTES.map(p => (
          <button key={p.name} title={p.name} onClick={() => setPalette({ ...p.palette })}
            className="h-7 w-7 rounded border" style={{ background: p.palette.bg }}>
            <span className="block h-2 w-2" style={{ background: p.palette.accent }} />
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        {(['bg', 'text', 'accent'] as const).map(k => (
          <label key={k} className="flex items-center gap-1">{k}
            <input type="color" value={palette[k]} onChange={e => setPalette({ ...palette, [k]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  )
}

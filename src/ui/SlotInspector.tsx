import { useDesign } from '../store/useDesign'
import type { FontFamily } from '../types'
import { ImageInput } from './ImageInput'

const FAMILIES: FontFamily[] = ['sans', 'display', 'mono', 'condensed']

export function SlotInspector() {
  const design = useDesign(s => s.design)
  const setContent = useDesign(s => s.setContent)
  const setText = useDesign(s => s.setText)
  return (
    <div className="space-y-6">
      {design.slots.map(slot => (
        <div key={slot.id} className="space-y-2 border-b pb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{slot.role}</div>
          {slot.role === 'image' ? (
            <ImageInput slotId={slot.id} />
          ) : (
            <>
              <label className="sr-only" htmlFor={slot.id}>{slot.id}</label>
              <textarea id={slot.id} aria-label={slot.id} value={slot.content}
                onChange={e => setContent(slot.id, e.target.value)}
                className="w-full resize-none border px-2 py-1 text-sm" rows={2} />
              <div className="flex flex-wrap gap-2 text-xs">
                <select value={slot.text!.family} onChange={e => setText(slot.id, { family: e.target.value as FontFamily })}>
                  {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <label>W<input type="number" min={100} max={900} step={100} value={slot.text!.weight}
                  onChange={e => setText(slot.id, { weight: Number(e.target.value) })} className="w-16 border px-1" /></label>
                <label>Size<input type="number" min={8} max={600} value={slot.text!.size}
                  onChange={e => setText(slot.id, { size: Number(e.target.value), fit: 'fixed' })} className="w-16 border px-1" /></label>
                <label>Track<input type="number" step={0.01} value={slot.text!.tracking}
                  onChange={e => setText(slot.id, { tracking: Number(e.target.value) })} className="w-16 border px-1" /></label>
                <select value={slot.text!.align} onChange={e => setText(slot.id, { align: e.target.value as 'left' | 'center' | 'right' })}>
                  <option>left</option><option>center</option><option>right</option>
                </select>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// src/ui/sidebar/ContentFields.tsx
import { useDesign } from '../../store/useDesign'
import { ImageInput } from '../ImageInput'

function humanize(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toUpperCase()
}

export function ContentFields() {
  const design = useDesign(s => s.design)
  const setContent = useDesign(s => s.setContent)

  const textSlots = design.slots.filter(
    s => s.role !== 'image' && s.role !== 'block',
  )
  const imageSlot = design.slots.find(s => s.role === 'image')

  return (
    <div className="sb-section space-y-4">
      {textSlots.map(slot => (
        <div key={slot.id} className="space-y-1">
          <label
            htmlFor={`cf-${slot.id}`}
            className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
          >
            {humanize(slot.id)}
          </label>
          <textarea
            id={`cf-${slot.id}`}
            aria-label={humanize(slot.id)}
            value={slot.content}
            onChange={e => setContent(slot.id, e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      ))}

      {imageSlot && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Image
          </div>
          <ImageInput slotId={imageSlot.id} />
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Tip — click any text on the poster to edit it in place. Click or drop an image onto the photo frame.
      </p>
    </div>
  )
}

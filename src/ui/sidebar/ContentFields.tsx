// src/ui/sidebar/ContentFields.tsx
import { useDesign } from '../../store/useDesign'
import { ImageInput } from '../ImageInput'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'

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
    s => s.role !== 'image' && s.role !== 'block' && s.role !== 'line',
  )
  const imageSlots = design.slots.filter(s => s.role === 'image')

  return (
    <div className="sb-section space-y-4">
      {textSlots.map(slot => (
        <div key={slot.id} className="space-y-1.5">
          <Label
            htmlFor={`cf-${slot.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            {humanize(slot.id)}
          </Label>
          <Textarea
            id={`cf-${slot.id}`}
            aria-label={humanize(slot.id)}
            value={slot.content}
            onChange={e => setContent(slot.id, e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      ))}

      {imageSlots.map((slot, i) => (
        <div key={slot.id} className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {imageSlots.length > 1 ? `Image ${i + 1}` : 'Image'}
          </div>
          <ImageInput slotId={slot.id} />
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Tip — click any text on the poster to edit it in place. Click or drop an image onto the photo frame.
      </p>
    </div>
  )
}

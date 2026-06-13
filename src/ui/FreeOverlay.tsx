import { useDesign } from '../store/useDesign'
import { canvasFor } from '../design/formats'
import { slotBox } from '../lib/grid'

/** Renders draggable handles over each slot. Coordinates are in canvas units;
 *  the parent scales this overlay to match the SVG via a CSS transform. */
export function FreeOverlay({ scale }: { scale: number }) {
  const design = useDesign(s => s.design)
  const setBox = useDesign(s => s.setBox)
  const canvas = canvasFor(design.format)

  const onDrag = (
    slotId: string,
    startBox: { x: number; y: number; w: number; h: number },
    e: React.PointerEvent,
  ) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const move = (ev: PointerEvent) => {
      setBox(slotId, {
        ...startBox,
        x: startBox.x + (ev.clientX - sx) / scale,
        y: startBox.y + (ev.clientY - sy) / scale,
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        width: canvas.w,
        height: canvas.h,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      {design.slots.map(s => {
        const b = slotBox(canvas, design.grid, s)
        return (
          <div
            key={s.id}
            onPointerDown={e => onDrag(s.id, b, e)}
            className="absolute cursor-move border border-dashed border-sky-500/70 hover:bg-sky-500/10"
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              pointerEvents: 'all',
            }}
          />
        )
      })}
    </div>
  )
}

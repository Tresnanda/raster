// src/ui/sidebar/CanvasChips.tsx
import type { Format } from '../../types'
import { useDesign } from '../../store/useDesign'
import { SegmentedControl } from '../controls/SegmentedControl'

const FORMAT_ORDER: Format[] = ['3:4', 'A4', '4:5', '1:1', '2:3', '9:16', '16:9']

export function CanvasChips() {
  const format = useDesign(s => s.design.format)
  const setFormat = useDesign(s => s.setFormat)

  return (
    <div className="sb-section">
      <SegmentedControl
        value={format}
        onValueChange={setFormat}
        aria-label="Canvas format"
        options={FORMAT_ORDER.map(f => ({ value: f, label: f }))}
      />
    </div>
  )
}

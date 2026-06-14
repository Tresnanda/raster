import { Wand2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useDesign } from '../../store/useDesign'

export function ArrangeControls() {
  const autoTidy = useDesign(s => s.autoTidy)

  return (
    <div className="sb-section">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={autoTidy}
        aria-label="Auto-tidy"
      >
        <Wand2 size={13} strokeWidth={2.25} />
        Auto-tidy
      </Button>
    </div>
  )
}

import { Archive, Save } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useDesign } from '../../store/useDesign'

export function PosterMineControls() {
  const savedCount = useDesign(s => s.savedPosters.length)
  const saveCurrentPoster = useDesign(s => s.saveCurrentPoster)
  const openMine = useDesign(s => s.openMine)

  return (
    <div className="sb-section space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveCurrentPoster('manual')}
          aria-label="Save to Mine"
        >
          <Save size={13} strokeWidth={2.25} />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={openMine}
          aria-label="Open Mine"
        >
          <Archive size={13} strokeWidth={2.25} />
          Mine
        </Button>
      </div>
      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
        {savedCount} saved poster{savedCount === 1 ? '' : 's'} ready to branch, compare, or revive.
      </p>
    </div>
  )
}

import { Archive, Save } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../components/ui/button'
import { useDesign } from '../../store/useDesign'

export function PosterMineControls() {
  const savedCount = useDesign(s => s.savedPosters.length)
  const savedPosters = useDesign(s => s.savedPosters)
  const snapshots = useMemo(
    () => savedPosters.filter(poster => poster.source === 'snapshot').slice(0, 3),
    [savedPosters],
  )
  const posterMineError = useDesign(s => s.posterMineError)
  const saveCurrentPoster = useDesign(s => s.saveCurrentPoster)
  const pinSnapshot = useDesign(s => s.pinSnapshot)
  const restoreSnapshot = useDesign(s => s.restoreSnapshot)
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
        Saved snapshots: {savedCount} poster{savedCount === 1 ? '' : 's'} archived to revive, branch, or compare.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={pinSnapshot}
        aria-label="Pin snapshot"
      >
        <Save size={13} strokeWidth={2.25} />
        Pin snapshot
      </Button>
      {snapshots.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {snapshots.map((snapshot, index) => (
            <Button
              key={snapshot.id}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => restoreSnapshot(snapshot.id)}
              aria-label={`Restore snapshot ${index + 1}`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      )}
      {posterMineError && (
        <p className="font-sans text-[10px] leading-relaxed text-destructive" role="status">
          {posterMineError}
        </p>
      )}
    </div>
  )
}

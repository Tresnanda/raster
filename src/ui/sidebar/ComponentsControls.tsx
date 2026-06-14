import { Box, Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useDesign } from '../../store/useDesign'

export function ComponentsControls() {
  const selectedCount = useDesign(s => s.selectedIds.length)
  const components = useDesign(s => s.componentLibrary)
  const saveSelectedComponent = useDesign(s => s.saveSelectedComponent)
  const insertComponent = useDesign(s => s.insertComponent)

  return (
    <div className="sb-section space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={selectedCount === 0}
        onClick={() => saveSelectedComponent(selectedCount > 1 ? 'Selection Group' : 'Element')}
        aria-label="Save selected component"
      >
        <Plus size={13} strokeWidth={2.25} />
        Save selection
      </Button>
      {components.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5">
          {components.slice(0, 5).map(component => (
            <Button
              key={component.id}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => insertComponent(component.id)}
              aria-label={`Insert ${component.name}`}
            >
              <Box size={12} strokeWidth={2.25} />
              {component.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useDesign } from '../store/useDesign'
import { listArchetypes } from '../archetypes'

export function ArchetypePicker() {
  const design = useDesign(s => s.design)
  const reset = useDesign(s => s.reset)
  return (
    <select value={design.archetype} onChange={e => reset(e.target.value, design.format)}
      className="w-full border px-2 py-1 text-sm">
      {listArchetypes().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  )
}

import { useRef } from 'react'
import { Toolbar } from './Toolbar'
import { CanvasStage } from './CanvasStage'
import { FormatSwitcher } from './FormatSwitcher'
import { SlotInspector } from './SlotInspector'
import '../archetypes/index'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  return (
    <div className="flex h-screen flex-col">
      <Toolbar svgRef={svgRef} />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <CanvasStage svgRef={svgRef} />
        </main>
        <aside className="w-80 overflow-y-auto border-l border-neutral-200 p-4 space-y-4">
          <FormatSwitcher />
          <SlotInspector />
        </aside>
      </div>
    </div>
  )
}

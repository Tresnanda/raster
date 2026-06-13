// src/ui/App.tsx
import { useRef } from 'react'
import { Sidebar } from './Sidebar'
import { CanvasStage } from './CanvasStage'
import { BottomBar } from './BottomBar'
import { CropModal } from './CropModal'
import '../archetypes/index'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar svgRef={svgRef} />
        <main className="min-w-0 flex-1">
          <CanvasStage svgRef={svgRef} />
        </main>
      </div>
      <BottomBar />
      {/* Phase C: crop modal, shown when cropRequest is non-null */}
      <CropModal />
    </div>
  )
}

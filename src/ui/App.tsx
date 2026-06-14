// src/ui/App.tsx
import { useRef } from 'react'
import { Sidebar } from './Sidebar'
import { CanvasStage } from './CanvasStage'
import { CropModal } from './CropModal'
import { ComposerRail } from './ComposerRail'
import { RiffModal } from './RiffModal'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import '../archetypes/index'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  // Mount global keyboard shortcuts once at the App level.
  useKeyboardShortcuts()
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar svgRef={svgRef} />
        <main className="min-h-0 min-w-0 flex-1">
          <CanvasStage svgRef={svgRef} />
        </main>
        <ComposerRail />
      </div>
      <CropModal />
      <RiffModal />
    </div>
  )
}

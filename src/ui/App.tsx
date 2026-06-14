// src/ui/App.tsx
import { useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { CanvasStage } from './CanvasStage'
import { CropModal } from './CropModal'
import { ComposerRail } from './ComposerRail'
import { RiffModal } from './RiffModal'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { TooltipProvider } from '../components/ui/tooltip'
import { useDesign } from '../store/useDesign'
import { readShareFromHash } from '../design/share'
import '../archetypes/index'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  // Mount global keyboard shortcuts once at the App level.
  useKeyboardShortcuts()

  // If the URL carries a shared design (#d=...), load it once on mount, then
  // strip the hash so a refresh doesn't keep re-loading the shared state.
  useEffect(() => {
    const shared = readShareFromHash()
    if (shared) {
      useDesign.getState().loadDesign(shared)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])
  return (
    <TooltipProvider>
      {/* fixed inset-0 pins the app to the viewport exactly — immune to content
          height, scroll-chaining, or Radix scroll-lock leaving the page tall. */}
      <div className="fixed inset-0 flex flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar svgRef={svgRef} />
          <main className="min-h-0 min-w-0 flex-1">
            <CanvasStage svgRef={svgRef} />
          </main>
          <ComposerRail />
        </div>
        <CropModal />
        <RiffModal />
      </div>
    </TooltipProvider>
  )
}

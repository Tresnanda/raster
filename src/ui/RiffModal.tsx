/**
 * RiffModal — full-canvas modal for the variation explorer.
 *
 * - Opens via store.openRiff()
 * - Renders a 3×3 grid of live mini Renderer previews (9 variants)
 * - Clicking a card → applyRiff → new working design, regenerate grid
 * - Reroll regenerates 9 variants from the current design without picking
 * - Strength slider 0..1 → setRiffStrength
 * - Lineage strip at bottom: nodes from root → current; click to gotoRiffNode
 * - Esc closes; Done closes
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { X, RefreshCw, Wand2 } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import type { Design } from '../types'
import { mutate } from '../design/mutate'
import { Renderer } from '../render/Renderer'
import { defaultMeasurer } from '../lib/measure'
import { Slider } from './controls/Slider'
import { Button } from '../components/ui/button'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GRID_SIZE = 9

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the path of node ids from root down to currentId (inclusive). */
function buildLineagePath(
  nodes: Record<string, import('../store/useDesign').RiffNode>,
  currentId: string | null,
  rootId: string | null,
): string[] {
  if (!currentId || !rootId || !nodes[currentId]) return []

  // Walk from currentId back to root by following parentId
  const path: string[] = []
  let id: string | null = currentId
  while (id && nodes[id]) {
    path.unshift(id)
    id = nodes[id].parentId
  }
  return path
}

/** Build 9 mutated variants from a design + strength. */
function buildVariants(design: Design, strength: number): Design[] {
  return Array.from({ length: GRID_SIZE }, () => mutate(design, strength))
}

// ---------------------------------------------------------------------------
// VariantCard — a single mini preview
// ---------------------------------------------------------------------------

function VariantCard({
  design,
  label,
  isLoading,
  onClick,
}: {
  design: Design | null
  label?: string
  isLoading?: boolean
  onClick?: () => void
}) {
  const m = useMemo(() => defaultMeasurer(), [])

  return (
    <button
      onClick={onClick}
      disabled={!design || isLoading}
      title={label ?? 'Apply this variation'}
      className={[
        'group relative overflow-hidden rounded-md border-2 bg-muted',
        'transition-all duration-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        design && !isLoading
          ? 'border-foreground hover:-translate-y-0.5 hover:shadow-brutal cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
          : 'border-input cursor-default',
      ].join(' ')}
      style={{ aspectRatio: `4 / 5` }}
    >
      {design ? (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <Renderer design={design} measure={m} />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-foreground/20 pointer-events-none">
            <span className="bg-foreground rounded-md px-3 py-1.5 font-sans text-[10px] font-semibold text-background">
              Use
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// LineageStrip — horizontal scroll of nodes from root to current
// ---------------------------------------------------------------------------
function LineageStrip({
  nodes,
  path,
  currentId,
  onGoto,
}: {
  nodes: Record<string, import('../store/useDesign').RiffNode>
  path: string[]
  currentId: string | null
  onGoto: (id: string) => void
}) {
  const m = useMemo(() => defaultMeasurer(), [])
  if (path.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto py-1 pb-2 px-1 scrollbar-thin">
      {path.map((id, idx) => {
        const node = nodes[id]
        if (!node) return null
        const isCurrent = id === currentId
        return (
          <button
            key={id}
            onClick={() => onGoto(id)}
            title={idx === 0 ? 'Root design' : `Step ${idx}`}
            className={[
              'relative flex-shrink-0 w-12 rounded-md overflow-hidden border-2 transition-all duration-100',
              isCurrent
                ? 'border-accent shadow-brutal-red scale-[1.05]'
                : 'border-foreground hover:border-accent cursor-pointer',
            ].join(' ')}
            style={{ aspectRatio: '4 / 5' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <Renderer design={node.design} measure={m} />
            </div>
            {idx === 0 && (
              <div className="absolute top-0 left-0 right-0 bg-foreground text-background font-sans text-[7px] font-semibold uppercase text-center leading-tight py-0.5 tracking-[0.06em]">
                Root
              </div>
            )}
            {isCurrent && (
              <div className="absolute bottom-0 left-0 right-0 bg-accent text-background font-sans text-[7px] font-semibold uppercase text-center leading-tight py-0.5 tracking-[0.06em]">
                Now
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RiffModal
// ---------------------------------------------------------------------------
export function RiffModal() {
  const riffOpen    = useDesign(s => s.riffOpen)
  const closeRiff   = useDesign(s => s.closeRiff)
  const riffStrength = useDesign(s => s.riffStrength)
  const setRiffStrength = useDesign(s => s.setRiffStrength)
  const design      = useDesign(s => s.design)
  const seedRiff    = useDesign(s => s.seedRiff)
  const applyRiff   = useDesign(s => s.applyRiff)
  const gotoRiffNode = useDesign(s => s.gotoRiffNode)
  const riffTree    = useDesign(s => s.riffTree)

  // Memoized variants — only recomputed when source design / strength changes
  // or user asks for a reroll. We key them on a roll counter + design seed.
  const [rollKey, setRollKey] = useState(0)

  const variants = useMemo(() => {
    if (!riffOpen) return []
    return buildVariants(design, riffStrength)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riffOpen, rollKey, design.seed, riffStrength])

  // On open: seed the tree (no-op if already seeded)
  useEffect(() => {
    if (riffOpen) {
      seedRiff()
    }
  }, [riffOpen, seedRiff])

  // Esc closes
  useEffect(() => {
    if (!riffOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRiff()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [riffOpen, closeRiff])

  const handlePick = useCallback((variant: Design) => {
    applyRiff(variant)
    // Regenerate 9 from the new working design (rollKey bump happens after
    // applyRiff updates the store, which re-triggers the useMemo via design.seed)
    setRollKey(k => k + 1)
  }, [applyRiff])

  const handleReroll = useCallback(() => {
    setRollKey(k => k + 1)
  }, [])

  const lineagePath = useMemo(
    () => buildLineagePath(riffTree.nodes, riffTree.currentId, riffTree.rootId),
    [riffTree],
  )

  if (!riffOpen) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col bg-foreground/40"
      onClick={(e) => { if (e.target === e.currentTarget) closeRiff() }}
      aria-modal="true"
      role="dialog"
      aria-label="Variation explorer"
    >
      {/* Modal card */}
      <div className="relative flex flex-col flex-1 max-w-5xl w-full mx-auto my-6 rounded-md border-2 border-foreground bg-background shadow-brutal-lg overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Wand2 size={14} className="text-accent" strokeWidth={2.5} />
            <h2 className="font-sans text-sm font-semibold text-foreground">
              Variation Explorer
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Strength slider */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="font-sans text-[10px] font-medium text-muted-foreground whitespace-nowrap">Subtle</span>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={riffStrength}
                onChange={setRiffStrength}
                aria-label="Mutation strength"
                className="flex-1"
              />
              <span className="font-sans text-[10px] font-medium text-muted-foreground whitespace-nowrap">Wild</span>
            </div>

            {/* Reroll */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReroll}
              title="Generate 9 new variations"
            >
              <RefreshCw size={11} strokeWidth={2.5} />
              Reroll
            </Button>

            {/* Done */}
            <Button
              variant="default"
              size="sm"
              onClick={closeRiff}
            >
              Done
            </Button>

            {/* Close icon */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeRiff}
              title="Close"
              aria-label="Close"
              className="border-transparent shadow-none"
            >
              <X size={13} strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        {/* Variant grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-secondary">
          <div className="grid grid-cols-3 gap-3">
            {variants.map((variant, i) => (
              <VariantCard
                key={i}
                design={variant}
                label={`Apply variation ${i + 1}`}
                onClick={() => handlePick(variant)}
              />
            ))}
          </div>
        </div>

        {/* Lineage strip */}
        {lineagePath.length > 1 && (
          <div className="border-t border-border/40 px-5 pt-3 pb-2">
            <p className="font-sans text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">
              History — click to branch
            </p>
            <LineageStrip
              nodes={riffTree.nodes}
              path={lineagePath}
              currentId={riffTree.currentId}
              onGoto={(id) => {
                gotoRiffNode(id)
                setRollKey(k => k + 1)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

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
        'group relative overflow-hidden rounded-md border bg-neutral-100',
        'transition-all duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30',
        design && !isLoading
          ? 'border-neutral-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-neutral-400 active:scale-[0.98] cursor-pointer'
          : 'border-neutral-100 cursor-default',
      ].join(' ')}
      style={{ aspectRatio: `4 / 5` }}
    >
      {design ? (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <Renderer design={design} measure={m} />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/10 pointer-events-none">
            <span className="bg-white/90 rounded px-2 py-1 text-[11px] font-semibold text-neutral-800 shadow-sm">
              Use
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
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
              'relative flex-shrink-0 w-12 rounded overflow-hidden border transition-all duration-100',
              isCurrent
                ? 'border-neutral-900 shadow-md ring-2 ring-neutral-900/20 scale-[1.05]'
                : 'border-neutral-200 hover:border-neutral-500 hover:scale-105 cursor-pointer',
            ].join(' ')}
            style={{ aspectRatio: '4 / 5' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <Renderer design={node.design} measure={m} />
            </div>
            {idx === 0 && (
              <div className="absolute top-0 left-0 right-0 bg-neutral-900/60 text-white text-[7px] font-bold text-center leading-tight py-0.5">
                ROOT
              </div>
            )}
            {isCurrent && (
              <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/80 text-white text-[7px] font-bold text-center leading-tight py-0.5">
                NOW
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
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) closeRiff() }}
      aria-modal="true"
      role="dialog"
      aria-label="Variation explorer"
    >
      {/* Modal card */}
      <div className="relative flex flex-col flex-1 max-w-5xl w-full mx-auto my-6 rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-neutral-700" />
            <h2 className="text-sm font-semibold text-neutral-900">Riff — variation explorer</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Strength slider */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <span className="text-[11px] text-neutral-400 whitespace-nowrap">Subtle</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={riffStrength}
                onChange={(e) => setRiffStrength(parseFloat(e.target.value))}
                aria-label="Mutation strength"
                className="flex-1 h-1.5 appearance-none rounded-full bg-neutral-200 accent-neutral-900 cursor-pointer"
              />
              <span className="text-[11px] text-neutral-400 whitespace-nowrap">Wild</span>
            </div>

            {/* Reroll */}
            <button
              onClick={handleReroll}
              title="Generate 9 new variations"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-neutral-200 text-neutral-700 hover:border-neutral-400 transition-colors duration-100 active:scale-[0.97]"
            >
              <RefreshCw size={12} />
              Reroll
            </button>

            {/* Done */}
            <button
              onClick={closeRiff}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors duration-100 active:scale-[0.97]"
            >
              Done
            </button>

            {/* Close icon */}
            <button
              onClick={closeRiff}
              title="Close"
              aria-label="Close"
              className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors duration-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Variant grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
          >
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
          <div className="border-t border-neutral-100 px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
              History — click to branch from any point
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

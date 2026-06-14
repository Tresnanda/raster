import { useMemo } from 'react'
import { Archive, Star, Trash2, X } from 'lucide-react'
import { useDesign } from '../store/useDesign'
import { Renderer } from '../render/Renderer'
import { defaultMeasurer } from '../lib/measure'
import { Button } from '../components/ui/button'
import { cn } from '@/lib/utils'

export function PosterMineModal() {
  const mineOpen = useDesign(s => s.mineOpen)
  const closeMine = useDesign(s => s.closeMine)
  const savedPosters = useDesign(s => s.savedPosters)
  const loadSavedPoster = useDesign(s => s.loadSavedPoster)
  const deleteSavedPoster = useDesign(s => s.deleteSavedPoster)
  const toggleFavorite = useDesign(s => s.toggleSavedPosterFavorite)
  const measure = useMemo(() => defaultMeasurer(), [])

  if (!mineOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex bg-foreground/40"
      role="dialog"
      aria-modal="true"
      aria-label="Poster Mine"
      onClick={(e) => { if (e.target === e.currentTarget) closeMine() }}
    >
      <div className="relative mx-auto my-6 flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-md border-2 border-foreground bg-background shadow-brutal-lg">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Archive size={15} className="text-accent" strokeWidth={2.5} />
            <h2 className="font-sans text-sm font-semibold text-foreground">Poster Mine</h2>
            <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {savedPosters.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={closeMine} aria-label="Close Poster Mine">
            <X size={16} />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {savedPosters.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-md border-2 border-dashed border-border p-8 text-center">
              <p className="max-w-sm font-sans text-xs leading-relaxed text-muted-foreground">
                Save posters from the sidebar, then branch from them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {savedPosters.map(poster => (
                <article key={poster.id} className="group overflow-hidden rounded-md border-2 border-foreground bg-card">
                  <button
                    aria-label={`Load ${poster.title}`}
                    onClick={() => loadSavedPoster(poster.id)}
                    className="relative block w-full overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    style={{ aspectRatio: '4 / 5' }}
                  >
                    <div className="absolute inset-0">
                      <Renderer design={poster.design} measure={measure} />
                    </div>
                    <span className="absolute bottom-2 left-2 rounded-sm bg-foreground px-2 py-1 font-sans text-[10px] font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
                      Load
                    </span>
                  </button>
                  <div className="space-y-2 border-t border-border/40 p-2">
                    <div>
                      <h3 className="truncate font-sans text-xs font-semibold text-foreground">{poster.title}</h3>
                      <p className="font-mono text-[9px] uppercase text-muted-foreground">{poster.source}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`${poster.favorite ? 'Unfavorite' : 'Favorite'} ${poster.title}`}
                        onClick={() => toggleFavorite(poster.id)}
                        className={cn('h-7 w-7', poster.favorite && 'bg-accent text-accent-foreground')}
                      >
                        <Star size={12} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Delete ${poster.title}`}
                        onClick={() => deleteSavedPoster(poster.id)}
                        className="h-7 w-7"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

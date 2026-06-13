import type { ArchetypeDef } from './schema'
import megaWord from './defs/mega-word'
import editorialGrid from './defs/editorial-grid'
import headlineList from './defs/headline-list'
import fullBleedCorners from './defs/full-bleed-corners'
import glyphFrame from './defs/glyph-frame'
import gridOverlayFigure from './defs/grid-overlay-figure'
import allType from './defs/all-type'
import splitDiptych from './defs/split-diptych'
import indexContents from './defs/index-contents'
import numberFeature from './defs/number-feature'
import modularBento from './defs/modular-bento'
import sidebarRail from './defs/sidebar-rail'

const REGISTRY = new Map<string, ArchetypeDef>()

export function register(def: ArchetypeDef) { REGISTRY.set(def.id, def) }

export function getArchetype(id: string): ArchetypeDef {
  const d = REGISTRY.get(id)
  if (!d) throw new Error(`Unknown archetype: ${id}`)
  return d
}

export function listArchetypes(): ArchetypeDef[] { return [...REGISTRY.values()] }

// Register all built-in archetypes
register(megaWord)
register(editorialGrid)
register(headlineList)
register(fullBleedCorners)
register(glyphFrame)
register(gridOverlayFigure)
register(allType)
register(splitDiptych)
register(indexContents)
register(numberFeature)
register(modularBento)
register(sidebarRail)

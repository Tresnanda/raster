import type { ArchetypeDef } from './schema'
import megaWord from './defs/mega-word'

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

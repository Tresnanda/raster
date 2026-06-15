import type { Design, GridCell, Slot } from '../types'
import { mulberry32 } from '../lib/rng'
import { contentForRole, generate, OccupancyGrid } from './generate'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function textSlots(design: Design): Slot[] {
  return design.slots.filter(slot => !!slot.text)
}

function nextContent(slot: Slot, seed: number, attempt = 0): string {
  const rng = mulberry32(seed + attempt * 9973)
  return contentForRole(slot.role, rng, slot)
}

export function reshuffleContent(design: Design, seed: number): Design {
  let changed = false
  const slots = clone(design.slots).map(slot => {
    if (!slot.text) return slot
    let content = nextContent(slot, seed + slot.id.length)
    for (let attempt = 1; attempt < 8 && content === slot.content; attempt++) {
      content = nextContent(slot, seed + slot.id.length, attempt)
    }
    if (content !== slot.content) changed = true
    return { ...slot, content }
  })

  if (!changed) {
    const firstText = slots.find(slot => slot.text)
    if (firstText) firstText.content = `${firstText.content} 01`
  }

  return {
    ...design,
    seed,
    slots,
  }
}

function takeByRole(queues: Map<Slot['role'], Slot[]>, role: Slot['role']): Slot | undefined {
  const direct = queues.get(role)
  if (direct?.length) return direct.shift()
  for (const queue of queues.values()) {
    if (queue.length) return queue.shift()
  }
  return undefined
}

function buildQueues(slots: Slot[]): Map<Slot['role'], Slot[]> {
  const queues = new Map<Slot['role'], Slot[]>()
  for (const slot of slots) {
    const queue = queues.get(slot.role) ?? []
    queue.push(slot)
    queues.set(slot.role, queue)
  }
  return queues
}

function freeCell(slots: Slot[], fallback: GridCell, cols: number, rows: number): GridCell {
  const occ = new OccupancyGrid(cols, rows)
  for (const slot of slots) {
    if (slot.role !== 'image' && slot.role !== 'line') occ.claim(slot.cell)
  }
  const candidates: GridCell[] = []
  for (let r = 0; r < rows; r++) {
    candidates.push({ c: 0, cs: Math.min(5, cols), r, rs: 1 })
    candidates.push({ c: Math.max(0, cols - 5), cs: Math.min(5, cols), r, rs: 1 })
  }
  return candidates.find(cell => occ.isFree(cell)) ?? fallback
}

export function reshuffleSystem(design: Design, seed: number): Design {
  const sourceText = textSlots(design)
  const queues = buildQueues(sourceText)
  const fresh = generate(design.format, { seed, candidateCount: 24 })

  const slots = fresh.slots.flatMap(slot => {
    if (!slot.text) return [slot]
    const source = takeByRole(queues, slot.role)
    if (!source) return []
    return [{ ...slot, content: source.content }]
  })

  const remaining = [...queues.values()].flat()
  const maxZ = slots.length ? Math.max(...slots.map(s => s.z ?? 0)) : 4
  const extras = remaining.map((slot, index) => ({
    ...clone(slot),
    id: `reshuffle-${seed}-${index}`,
    box: undefined,
    z: maxZ + index + 1,
    typeClass: slot.typeClass === 'title' ? 'body' as const : slot.typeClass,
    cell: freeCell(slots, slot.cell, fresh.grid.cols, fresh.grid.rows),
  }))

  return {
    ...fresh,
    seed,
    slots: [...slots, ...extras],
  }
}

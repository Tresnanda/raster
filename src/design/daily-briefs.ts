import type { Design, Format, GenerationBrief, SwissGrammar } from '../types'
import { generate } from './generate'

export interface DailySwissBrief extends GenerationBrief {
  id: string
  title: string
  prompt: string
  constraints: string[]
  grammar: SwissGrammar
  format: Format
}

export interface AppliedDailyBrief {
  date: string
  brief: DailySwissBrief
  design: Design
}

export const DAILY_SWISS_BRIEFS: DailySwissBrief[] = [
  {
    id: 'zurich-noise',
    title: 'Noise Abatement',
    prompt: 'Make a civic PSA where structure creates tension.',
    constraints: ['one dominant message', 'strict margins', 'one accent signal'],
    grammar: 'asymmetric-headline',
    density: 'balanced',
    imageMode: 'optional',
    accentMode: 'required',
    format: '4:5',
  },
  {
    id: 'basel-type-sheet',
    title: 'Type Specimen Wall',
    prompt: 'Make information itself become the image.',
    constraints: ['type first', 'no decorative imagery', 'visible hierarchy'],
    grammar: 'typographic-monument',
    density: 'dense',
    imageMode: 'none',
    accentMode: 'optional',
    format: 'A4',
  },
  {
    id: 'industrial-index',
    title: 'Factory Index',
    prompt: 'Turn catalog data into a precise industrial poster.',
    constraints: ['index rail', 'small technical copy', 'high contrast'],
    grammar: 'index-rail',
    density: 'dense',
    imageMode: 'optional',
    accentMode: 'none',
    format: '3:4',
  },
  {
    id: 'running-light',
    title: 'Kinetic Event',
    prompt: 'Compose a sports poster that feels fast but remains readable.',
    constraints: ['large title', 'image allowed', 'controlled occlusion only'],
    grammar: 'image-diptych',
    density: 'balanced',
    imageMode: 'required',
    accentMode: 'required',
    format: '4:5',
  },
  {
    id: 'modular-program',
    title: 'Program Grid',
    prompt: 'Build a modular schedule that still has a hero moment.',
    constraints: ['modular blocks', 'clear reading order', 'no centered body copy'],
    grammar: 'modular-catalog',
    density: 'quiet',
    imageMode: 'none',
    accentMode: 'optional',
    format: '1:1',
  },
]

export function dailyBriefSeed(date: string): number {
  let hash = 2166136261
  for (let i = 0; i < date.length; i++) {
    hash ^= date.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function dailyBriefForDate(date: string): DailySwissBrief {
  const seed = dailyBriefSeed(date)
  return DAILY_SWISS_BRIEFS[seed % DAILY_SWISS_BRIEFS.length]
}

export function buildDailyBriefDesign(date = todayKey(), preferredFormat?: Format): AppliedDailyBrief {
  const brief = dailyBriefForDate(date)
  const seed = dailyBriefSeed(date)
  const format = preferredFormat ?? brief.format
  const design = generate(format, {
    seed,
    grammar: brief.grammar,
    candidateCount: 24,
  })

  return {
    date,
    brief,
    design: {
      ...design,
      seed,
      generation: design.generation
        ? {
            ...design.generation,
            grammar: brief.grammar,
            brief: {
              density: brief.density,
              imageMode: brief.imageMode,
              accentMode: brief.accentMode,
            },
          }
        : undefined,
    },
  }
}

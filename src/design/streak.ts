export const STREAK_KEY = 'raster:streak'

export interface StreakState {
  current: number
  longest: number
  lastDate: string | null
}

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastDate: null,
}

function parseDay(date: string): number | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  return Math.floor(Date.UTC(year, month, day) / 86_400_000)
}

function normalize(value: Partial<StreakState> | null | undefined): StreakState {
  return {
    current: Math.max(0, Math.floor(value?.current ?? 0)),
    longest: Math.max(0, Math.floor(value?.longest ?? 0)),
    lastDate: value?.lastDate ?? null,
  }
}

export function recordVisit(today: string, prev: StreakState = EMPTY_STREAK): StreakState {
  const previous = normalize(prev)
  const todayDay = parseDay(today)
  if (todayDay === null) return previous
  if (!previous.lastDate) {
    return { current: 1, longest: Math.max(1, previous.longest), lastDate: today }
  }

  const lastDay = parseDay(previous.lastDate)
  if (lastDay === null) {
    return { current: 1, longest: Math.max(1, previous.longest), lastDate: today }
  }
  if (todayDay <= lastDay) return previous

  const current = todayDay - lastDay === 1 ? previous.current + 1 : 1
  return {
    current,
    longest: Math.max(previous.longest, current),
    lastDate: today,
  }
}

export function readStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return EMPTY_STREAK
    return normalize(JSON.parse(raw) as Partial<StreakState>)
  } catch {
    return EMPTY_STREAK
  }
}

export function writeStreak(state: StreakState): boolean {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(normalize(state)))
    return true
  } catch {
    return false
  }
}

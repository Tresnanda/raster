import { beforeEach, expect, test } from 'vitest'
import { EMPTY_STREAK, readStreak, recordVisit, writeStreak } from './streak'

beforeEach(() => {
  localStorage.clear()
})

test('recordVisit starts and increments consecutive daily streaks', () => {
  const dayOne = recordVisit('2026-06-14', EMPTY_STREAK)
  const dayTwo = recordVisit('2026-06-15', dayOne)
  const dayThree = recordVisit('2026-06-16', dayTwo)

  expect(dayOne).toEqual({ current: 1, longest: 1, lastDate: '2026-06-14' })
  expect(dayTwo).toEqual({ current: 2, longest: 2, lastDate: '2026-06-15' })
  expect(dayThree).toEqual({ current: 3, longest: 3, lastDate: '2026-06-16' })
})

test('recordVisit does not double-count a same-day visit', () => {
  const previous = { current: 4, longest: 7, lastDate: '2026-06-14' }

  expect(recordVisit('2026-06-14', previous)).toEqual(previous)
})

test('recordVisit resets current after a gap while preserving longest', () => {
  const previous = { current: 4, longest: 7, lastDate: '2026-06-14' }

  expect(recordVisit('2026-06-17', previous)).toEqual({
    current: 1,
    longest: 7,
    lastDate: '2026-06-17',
  })
})

test('readStreak and writeStreak persist the local habit state', () => {
  const state = { current: 2, longest: 5, lastDate: '2026-06-14' }

  expect(writeStreak(state)).toBe(true)
  expect(readStreak()).toEqual(state)
})

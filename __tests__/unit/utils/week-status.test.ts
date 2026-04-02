import { getWeekStatus, sortWeeks } from '@/lib/utils/week-status'
import type { Session } from '@/types'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    group_id: 'group-1',
    user_id: 'user-1',
    week_number: 1,
    session_type: 'run',
    target_distance_km: 10,
    target_duration_minutes: null,
    target_description: 'Easy run',
    scheduled_date: '2026-04-01',
    completed: false,
    completed_at: null,
    strava_activity_id: null,
    points_awarded: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const TODAY = '2026-04-10'

describe('getWeekStatus', () => {
  it('returns "active" when no sessions have a scheduled_date', () => {
    expect(getWeekStatus([makeSession({ scheduled_date: null })], TODAY)).toBe('active')
  })

  it('returns "active" for an empty session list', () => {
    expect(getWeekStatus([], TODAY)).toBe('active')
  })

  it('returns "active" when the latest session is today', () => {
    expect(getWeekStatus([makeSession({ scheduled_date: TODAY })], TODAY)).toBe('active')
  })

  it('returns "active" when the latest session is in the future', () => {
    expect(getWeekStatus([makeSession({ scheduled_date: '2026-05-01' })], TODAY)).toBe('active')
  })

  it('returns "past-complete" when week is over and all active sessions are done', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-30', completed: true }),
      makeSession({ scheduled_date: '2026-04-01', completed: true }),
    ]
    expect(getWeekStatus(sessions, TODAY)).toBe('past-complete')
  })

  it('returns "past-incomplete" when week is over and some sessions are not done', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-30', completed: true }),
      makeSession({ scheduled_date: '2026-04-01', completed: false }),
    ]
    expect(getWeekStatus(sessions, TODAY)).toBe('past-incomplete')
  })

  it('returns "past-incomplete" when week is over and no sessions are done', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-30', completed: false }),
    ]
    expect(getWeekStatus(sessions, TODAY)).toBe('past-incomplete')
  })

  it('ignores rest sessions when determining completeness', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-30', completed: true }),
      makeSession({ scheduled_date: '2026-03-31', session_type: 'rest', completed: false }),
    ]
    expect(getWeekStatus(sessions, TODAY)).toBe('past-complete')
  })
})

describe('sortWeeks', () => {
  const activeWeek: [number, Session[]] = [3, [makeSession({ scheduled_date: '2026-04-15' })]]
  const pastCompleteWeek: [number, Session[]] = [1, [makeSession({ scheduled_date: '2026-03-30', completed: true })]]
  const pastIncompleteWeek: [number, Session[]] = [2, [makeSession({ scheduled_date: '2026-04-05', completed: false })]]

  it('puts active weeks before past weeks', () => {
    const result = sortWeeks([pastCompleteWeek, activeWeek], TODAY)
    expect(result[0][0]).toBe(3) // active
    expect(result[1][0]).toBe(1) // past
  })

  it('sorts active weeks ascending by week number', () => {
    const week5: [number, Session[]] = [5, [makeSession({ scheduled_date: '2026-05-01' })]]
    const week4: [number, Session[]] = [4, [makeSession({ scheduled_date: '2026-04-20' })]]
    const result = sortWeeks([week5, week4], TODAY)
    expect(result.map(([n]) => n)).toEqual([4, 5])
  })

  it('sorts past weeks ascending by week number after active weeks', () => {
    const result = sortWeeks([pastIncompleteWeek, pastCompleteWeek, activeWeek], TODAY)
    expect(result.map(([n]) => n)).toEqual([3, 1, 2])
  })
})

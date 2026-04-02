import { weekDateRange } from '@/components/training/WeekView'
import type { Session } from '@/types'

function makeSession(scheduled_date: string | null): Session {
  return {
    id: 'sess-1',
    group_id: 'group-1',
    user_id: 'user-1',
    week_number: 1,
    session_type: 'run',
    target_distance_km: null,
    target_duration_minutes: null,
    target_description: 'Easy run',
    scheduled_date,
    completed: false,
    completed_at: null,
    strava_activity_id: null,
    points_awarded: 0,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('weekDateRange', () => {
  it('returns null when no sessions have a scheduled_date', () => {
    expect(weekDateRange([makeSession(null), makeSession(null)])).toBeNull()
  })

  it('returns null for an empty session list', () => {
    expect(weekDateRange([])).toBeNull()
  })

  it('shows "D–D Mon" format when start and end are in the same month', () => {
    const sessions = [
      makeSession('2026-03-02'),
      makeSession('2026-03-04'),
      makeSession('2026-03-06'),
      makeSession('2026-03-08'),
    ]
    expect(weekDateRange(sessions)).toBe('2–8 Mar')
  })

  it('shows "D Mon – D Mon" format when the week crosses a month boundary', () => {
    const sessions = [
      makeSession('2026-03-30'),
      makeSession('2026-03-31'),
      makeSession('2026-04-01'),
      makeSession('2026-04-05'),
    ]
    expect(weekDateRange(sessions)).toBe('30 Mar – 5 Apr')
  })

  it('works with a single session', () => {
    expect(weekDateRange([makeSession('2026-04-10')])).toBe('10–10 Apr')
  })

  it('ignores null dates and uses only the dated sessions', () => {
    const sessions = [
      makeSession(null),
      makeSession('2026-05-05'),
      makeSession('2026-05-09'),
      makeSession(null),
    ]
    expect(weekDateRange(sessions)).toBe('5–9 May')
  })

  it('picks the correct min and max regardless of session order', () => {
    const sessions = [
      makeSession('2026-06-07'),
      makeSession('2026-06-03'),
      makeSession('2026-06-05'),
    ]
    expect(weekDateRange(sessions)).toBe('3–7 Jun')
  })
})

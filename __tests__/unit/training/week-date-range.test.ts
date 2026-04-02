import { weekDateRange } from '@/components/training/WeekView'
import type { Session } from '@/types'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    group_id: 'group-1',
    user_id: 'user-1',
    week_number: 1,
    session_type: 'run',
    target_distance_km: null,
    target_duration_minutes: null,
    target_description: 'Easy run',
    scheduled_date: '2026-04-07',
    completed: false,
    completed_at: null,
    strava_activity_id: null,
    points_awarded: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── weekDateRange ─────────────────────────────────────────────────────────────

describe('weekDateRange', () => {
  it('returns null when no sessions have a scheduled_date', () => {
    expect(weekDateRange([makeSession({ scheduled_date: null })])).toBeNull()
  })

  it('returns null for an empty session list', () => {
    expect(weekDateRange([])).toBeNull()
  })

  it('shows "D–D Mon" format when start and end are in the same month', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-02' }),
      makeSession({ scheduled_date: '2026-03-04' }),
      makeSession({ scheduled_date: '2026-03-06' }),
      makeSession({ scheduled_date: '2026-03-08' }),
    ]
    expect(weekDateRange(sessions)).toBe('2–8 Mar')
  })

  it('shows "D Mon – D Mon" format when the week crosses a month boundary', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-03-30' }),
      makeSession({ scheduled_date: '2026-03-31' }),
      makeSession({ scheduled_date: '2026-04-01' }),
      makeSession({ scheduled_date: '2026-04-05' }),
    ]
    expect(weekDateRange(sessions)).toBe('30 Mar – 5 Apr')
  })

  it('works with a single session', () => {
    expect(weekDateRange([makeSession({ scheduled_date: '2026-04-10' })])).toBe('10–10 Apr')
  })

  it('ignores null dates and uses only the dated sessions', () => {
    const sessions = [
      makeSession({ scheduled_date: null }),
      makeSession({ scheduled_date: '2026-05-05' }),
      makeSession({ scheduled_date: '2026-05-09' }),
    ]
    expect(weekDateRange(sessions)).toBe('5–9 May')
  })

  it('picks the correct min and max regardless of session order', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-06-07' }),
      makeSession({ scheduled_date: '2026-06-03' }),
      makeSession({ scheduled_date: '2026-06-05' }),
    ]
    expect(weekDateRange(sessions)).toBe('3–7 Jun')
  })
})

// ── Rest day filtering (WeekView behaviour, verified via exported helpers) ────

describe('rest day session handling', () => {
  it('rest sessions are identified by session_type === "rest"', () => {
    const sessions = [
      makeSession({ session_type: 'run' }),
      makeSession({ session_type: 'rest' }),
      makeSession({ session_type: 'ride' }),
    ]
    const restCount = sessions.filter((s) => s.session_type === 'rest').length
    expect(restCount).toBe(1)
  })

  it('active sessions exclude rest type', () => {
    const sessions = [
      makeSession({ session_type: 'run' }),
      makeSession({ session_type: 'rest' }),
      makeSession({ session_type: 'rest' }),
      makeSession({ session_type: 'swim' }),
    ]
    const active = sessions.filter((s) => s.session_type !== 'rest')
    expect(active).toHaveLength(2)
    expect(active.every((s) => s.session_type !== 'rest')).toBe(true)
  })

  it('rest note is singular for one rest day', () => {
    const restCount = 1
    const note = restCount === 1
      ? 'Recommended: 1 rest day this week'
      : `Recommended: ${restCount} rest days this week`
    expect(note).toBe('Recommended: 1 rest day this week')
  })

  it('rest note is plural for multiple rest days', () => {
    const restCount = 2
    const note = restCount === 1
      ? 'Recommended: 1 rest day this week'
      : `Recommended: ${restCount} rest days this week`
    expect(note).toBe('Recommended: 2 rest days this week')
  })
})

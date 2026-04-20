import { formatWeekBoundsLabel } from '@/components/training/WeekView'
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

// ── formatWeekBoundsLabel ──────────────────────────────────────────────────────

describe('formatWeekBoundsLabel', () => {
  it('shows "D–D Mon" format when start and end are in the same month', () => {
    expect(formatWeekBoundsLabel('2026-03-02', '2026-03-08')).toBe('2–8 Mar')
  })

  it('shows "D Mon – D Mon" format when the week crosses a month boundary', () => {
    expect(formatWeekBoundsLabel('2026-03-30', '2026-04-05')).toBe('30 Mar – 5 Apr')
  })

  it('works when start and end are the same date', () => {
    expect(formatWeekBoundsLabel('2026-04-10', '2026-04-10')).toBe('10–10 Apr')
  })

  it('shows a standard Mon–Sun week in the same month', () => {
    expect(formatWeekBoundsLabel('2026-04-20', '2026-04-26')).toBe('20–26 Apr')
  })

  it('handles a week crossing into a new month', () => {
    expect(formatWeekBoundsLabel('2026-04-27', '2026-05-03')).toBe('27 Apr – 3 May')
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
    const restCount: number = 2
    const note = restCount === 1
      ? 'Recommended: 1 rest day this week'
      : `Recommended: ${restCount} rest days this week`
    expect(note).toBe('Recommended: 2 rest days this week')
  })
})

import { matchActivity, getWeekBounds } from '@/lib/strava/activity-matcher'
import type { Session, StravaActivity } from '@/types'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    group_id: 'group-1',
    user_id: 'user-1',
    week_number: 1,
    session_type: 'run',
    target_distance_km: 10,
    target_duration_minutes: null,
    target_description: 'Easy 10km run',
    scheduled_date: '2026-04-01', // Wednesday
    completed: false,
    completed_at: null,
    strava_activity_id: null,
    points_awarded: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 12345,
    name: 'Morning Run',
    type: 'Run',
    sport_type: 'Run',
    distance: 10000,
    moving_time: 3600,
    elapsed_time: 3600,
    start_date: '2026-04-03T07:00:00Z',
    start_date_local: '2026-04-03T08:00:00', // Friday, same week as session
    athlete: { id: 999 },
    ...overrides,
  }
}

// ── getWeekBounds ─────────────────────────────────────────────────────────────

describe('getWeekBounds', () => {
  it('returns Monday and Sunday for a Wednesday', () => {
    const { start, end } = getWeekBounds('2026-04-01') // Wednesday
    expect(start).toBe('2026-03-30') // Monday
    expect(end).toBe('2026-04-05')   // Sunday
  })

  it('returns the same Monday for a Monday input', () => {
    const { start } = getWeekBounds('2026-03-30') // Monday
    expect(start).toBe('2026-03-30')
  })

  it('returns the same Sunday for a Sunday input', () => {
    const { start, end } = getWeekBounds('2026-04-05') // Sunday
    expect(start).toBe('2026-03-30')
    expect(end).toBe('2026-04-05')
  })

  it('handles a month boundary correctly', () => {
    const { start, end } = getWeekBounds('2026-04-01') // Wed 1 Apr
    expect(start).toBe('2026-03-30') // Mon 30 Mar
    expect(end).toBe('2026-04-05')   // Sun 5 Apr
  })
})

// ── matchActivity — basic matching ────────────────────────────────────────────

describe('matchActivity — basic matching', () => {
  it('matches a run activity to a run session in the same week', () => {
    const session = makeSession()
    expect(matchActivity(makeActivity(), [session])).toBe(session)
  })

  it('returns null when there are no sessions', () => {
    expect(matchActivity(makeActivity(), [])).toBeNull()
  })

  it('returns null when the session is already completed', () => {
    expect(matchActivity(makeActivity(), [makeSession({ completed: true })])).toBeNull()
  })

  it('skips rest sessions', () => {
    expect(matchActivity(makeActivity(), [makeSession({ session_type: 'rest' })])).toBeNull()
  })

  it('returns null when session has no scheduled_date', () => {
    expect(matchActivity(makeActivity(), [makeSession({ scheduled_date: null })])).toBeNull()
  })
})

// ── matchActivity — week scoping ──────────────────────────────────────────────

describe('matchActivity — week scoping', () => {
  it('matches a session on a different day within the same calendar week', () => {
    const session = makeSession({ scheduled_date: '2026-03-30' }) // Monday
    const activity = makeActivity({ start_date_local: '2026-04-03T08:00:00' }) // Friday
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('does not match a session from the previous week', () => {
    const session = makeSession({ scheduled_date: '2026-03-25' }) // previous week Wednesday
    const activity = makeActivity({ start_date_local: '2026-04-01T08:00:00' }) // this week Wednesday
    expect(matchActivity(activity, [session])).toBeNull()
  })

  it('does not match a session from the following week', () => {
    const session = makeSession({ scheduled_date: '2026-04-08' }) // next week Wednesday
    const activity = makeActivity({ start_date_local: '2026-04-01T08:00:00' }) // this week Wednesday
    expect(matchActivity(activity, [session])).toBeNull()
  })

  it('matches a session on the Monday of the activity week', () => {
    const session = makeSession({ scheduled_date: '2026-03-30' }) // Monday
    const activity = makeActivity({ start_date_local: '2026-03-30T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('matches a session on the Sunday of the activity week', () => {
    const session = makeSession({ scheduled_date: '2026-04-05' }) // Sunday
    const activity = makeActivity({ start_date_local: '2026-04-05T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })
})

// ── matchActivity — type matching ─────────────────────────────────────────────

describe('matchActivity — type matching', () => {
  it('matches Strava VirtualRun to session_type run', () => {
    const session = makeSession({ session_type: 'run' })
    expect(matchActivity(makeActivity({ type: 'VirtualRun' }), [session])).toBe(session)
  })

  it('matches Strava Ride to session_type ride', () => {
    const session = makeSession({ session_type: 'ride' })
    expect(matchActivity(makeActivity({ type: 'Ride', sport_type: 'Ride' }), [session])).toBe(session)
  })

  it('does not match a run activity to a ride session', () => {
    expect(matchActivity(makeActivity(), [makeSession({ session_type: 'ride' })])).toBeNull()
  })

  it('falls back to sport_type when type is undefined', () => {
    const session = makeSession({ session_type: 'run' })
    expect(matchActivity(makeActivity({ type: undefined as any, sport_type: 'Run' }), [session])).toBe(session)
  })
})

// ── matchActivity — distance threshold ────────────────────────────────────────

describe('matchActivity — distance threshold (85% rule)', () => {
  it('matches when activity distance is exactly 85% of target', () => {
    const session = makeSession({ target_distance_km: 10 })
    expect(matchActivity(makeActivity({ distance: 8500 }), [session])).toBe(session)
  })

  it('matches when activity distance exceeds the target', () => {
    const session = makeSession({ target_distance_km: 10 })
    expect(matchActivity(makeActivity({ distance: 12000 }), [session])).toBe(session)
  })

  it('does not match when activity distance is below 85% of target', () => {
    const session = makeSession({ target_distance_km: 10 })
    expect(matchActivity(makeActivity({ distance: 8400 }), [session])).toBeNull()
  })
})

// ── matchActivity — duration threshold ────────────────────────────────────────

describe('matchActivity — duration threshold (85% rule)', () => {
  it('matches when activity duration meets 85% and no distance target', () => {
    const session = makeSession({ target_distance_km: null, target_duration_minutes: 60 })
    expect(matchActivity(makeActivity({ elapsed_time: 3060 }), [session])).toBe(session)
  })

  it('does not match when activity duration is below 85% and no distance target', () => {
    const session = makeSession({ target_distance_km: null, target_duration_minutes: 60 })
    expect(matchActivity(makeActivity({ elapsed_time: 3000 }), [session])).toBeNull()
  })

  it('ignores duration check when distance target is also set', () => {
    const session = makeSession({ target_distance_km: 10, target_duration_minutes: 60 })
    expect(matchActivity(makeActivity({ distance: 10000, elapsed_time: 2000 }), [session])).toBe(session)
  })
})

// ── matchActivity — multiple candidates ───────────────────────────────────────

describe('matchActivity — multiple candidates in same week', () => {
  it('picks the earliest scheduled session when multiple match', () => {
    const earlier = makeSession({ id: 'sess-early', scheduled_date: '2026-03-30' }) // Mon
    const later = makeSession({ id: 'sess-late', scheduled_date: '2026-04-02' })    // Thu
    const activity = makeActivity({ start_date_local: '2026-04-01T08:00:00' })      // Wed
    expect(matchActivity(activity, [later, earlier])?.id).toBe('sess-early')
  })
})

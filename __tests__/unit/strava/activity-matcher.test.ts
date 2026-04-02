import { matchActivity } from '@/lib/strava/activity-matcher'
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
    scheduled_date: '2026-03-04',
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
    distance: 10000, // 10 km
    moving_time: 3600,
    elapsed_time: 3600,
    start_date: '2026-03-04T07:00:00Z',
    start_date_local: '2026-03-04T08:00:00',
    athlete: { id: 999 },
    ...overrides,
  }
}

describe('matchActivity — basic matching', () => {
  it('matches a run activity to a run session', () => {
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
})

describe('matchActivity — type matching', () => {
  it('matches Strava Run to session_type run', () => {
    const session = makeSession({ session_type: 'run' })
    expect(matchActivity(makeActivity({ type: 'Run' }), [session])).toBe(session)
  })

  it('matches Strava VirtualRun to session_type run', () => {
    const session = makeSession({ session_type: 'run' })
    expect(matchActivity(makeActivity({ type: 'VirtualRun' }), [session])).toBe(session)
  })

  it('matches Strava Ride to session_type ride', () => {
    const session = makeSession({ session_type: 'ride' })
    const activity = makeActivity({ type: 'Ride', sport_type: 'Ride' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('does not match a run activity to a ride session', () => {
    expect(matchActivity(makeActivity({ type: 'Run' }), [makeSession({ session_type: 'ride' })])).toBeNull()
  })

  it('falls back to sport_type when type is undefined', () => {
    const session = makeSession({ session_type: 'run' })
    const activity = makeActivity({ type: undefined as any, sport_type: 'Run' })
    expect(matchActivity(activity, [session])).toBe(session)
  })
})

describe('matchActivity — date is ignored', () => {
  it('matches a session regardless of how far in the past the scheduled date is', () => {
    const session = makeSession({ scheduled_date: '2026-01-01' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('matches a session regardless of how far in the future the scheduled date is', () => {
    const session = makeSession({ scheduled_date: '2026-12-31' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('matches session with no scheduled_date', () => {
    const session = makeSession({ scheduled_date: null })
    expect(matchActivity(makeActivity(), [session])).toBe(session)
  })
})

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
    const activity = makeActivity({ distance: 10000, elapsed_time: 2000 })
    expect(matchActivity(activity, [session])).toBe(session)
  })
})

describe('matchActivity — multiple candidates', () => {
  it('picks the earliest scheduled session when multiple match', () => {
    const earlier = makeSession({ id: 'sess-early', scheduled_date: '2026-02-01' })
    const later = makeSession({ id: 'sess-late', scheduled_date: '2026-03-10' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [later, earlier])?.id).toBe('sess-early')
  })

  it('prefers sessions with a scheduled date over those without', () => {
    const dated = makeSession({ id: 'dated', scheduled_date: '2026-03-04' })
    const undated = makeSession({ id: 'undated', scheduled_date: null })
    expect(matchActivity(makeActivity(), [undated, dated])?.id).toBe('dated')
  })

  it('matches a session that is weeks overdue', () => {
    const overdue = makeSession({ scheduled_date: '2026-01-01' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [overdue])).toBe(overdue)
  })
})

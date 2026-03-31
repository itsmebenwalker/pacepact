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
  it('matches a run activity to a run session on the same date', () => {
    const session = makeSession()
    const activity = makeActivity()
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('returns null when there are no sessions', () => {
    expect(matchActivity(makeActivity(), [])).toBeNull()
  })

  it('returns null when the session is already completed', () => {
    const session = makeSession({ completed: true })
    expect(matchActivity(makeActivity(), [session])).toBeNull()
  })

  it('skips rest sessions', () => {
    const session = makeSession({ session_type: 'rest' })
    expect(matchActivity(makeActivity(), [session])).toBeNull()
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
    const session = makeSession({ session_type: 'ride' })
    expect(matchActivity(makeActivity({ type: 'Run' }), [session])).toBeNull()
  })

  it('falls back to sport_type when type is undefined', () => {
    const session = makeSession({ session_type: 'run' })
    // ?? only coalesces null/undefined — not empty string
    const activity = makeActivity({ type: undefined as any, sport_type: 'Run' })
    expect(matchActivity(activity, [session])).toBe(session)
  })
})

describe('matchActivity — date window', () => {
  it('matches when activity is 1 day before the scheduled date', () => {
    const session = makeSession({ scheduled_date: '2026-03-05' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('matches when activity is 2 days after the scheduled date', () => {
    const session = makeSession({ scheduled_date: '2026-03-02' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('does not match when activity is 3 days outside the window', () => {
    const session = makeSession({ scheduled_date: '2026-03-01' })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [session])).toBeNull()
  })

  it('matches session with no scheduled_date regardless of activity date', () => {
    const session = makeSession({ scheduled_date: null })
    expect(matchActivity(makeActivity(), [session])).toBe(session)
  })
})

describe('matchActivity — distance threshold (85% rule)', () => {
  it('matches when activity distance is exactly 85% of target', () => {
    // target 10 km, activity 8.5 km exactly
    const session = makeSession({ target_distance_km: 10 })
    const activity = makeActivity({ distance: 8500 })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('matches when activity distance exceeds the target', () => {
    const session = makeSession({ target_distance_km: 10 })
    const activity = makeActivity({ distance: 12000 })
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('does not match when activity distance is below 85% of target', () => {
    // target 10 km, activity 8.4 km (84%)
    const session = makeSession({ target_distance_km: 10 })
    const activity = makeActivity({ distance: 8400 })
    expect(matchActivity(activity, [session])).toBeNull()
  })
})

describe('matchActivity — duration threshold (85% rule)', () => {
  it('matches when activity duration meets 85% and no distance target', () => {
    // target 60 min, activity 51 min (85%)
    const session = makeSession({ target_distance_km: null, target_duration_minutes: 60 })
    const activity = makeActivity({ elapsed_time: 3060 }) // 51 min
    expect(matchActivity(activity, [session])).toBe(session)
  })

  it('does not match when activity duration is below 85% and no distance target', () => {
    // target 60 min, activity 50 min (83%)
    const session = makeSession({ target_distance_km: null, target_duration_minutes: 60 })
    const activity = makeActivity({ elapsed_time: 3000 }) // 50 min
    expect(matchActivity(activity, [session])).toBeNull()
  })

  it('ignores duration check when distance target is also set', () => {
    // Both set — only distance check should run
    const session = makeSession({ target_distance_km: 10, target_duration_minutes: 60 })
    // Distance OK, duration short — should still match
    const activity = makeActivity({ distance: 10000, elapsed_time: 2000 })
    expect(matchActivity(activity, [session])).toBe(session)
  })
})

describe('matchActivity — multiple candidates', () => {
  it('picks the session with the closest scheduled date', () => {
    const closer = makeSession({
      id: 'sess-close',
      scheduled_date: '2026-03-04', // same day as activity
    })
    const further = makeSession({
      id: 'sess-far',
      scheduled_date: '2026-03-02', // 2 days before activity
    })
    const activity = makeActivity({ start_date_local: '2026-03-04T08:00:00' })
    expect(matchActivity(activity, [further, closer])?.id).toBe('sess-close')
  })

  it('prefers sessions with a scheduled date over those without', () => {
    const dated = makeSession({ id: 'dated', scheduled_date: '2026-03-04' })
    const undated = makeSession({ id: 'undated', scheduled_date: null })
    const activity = makeActivity()
    expect(matchActivity(activity, [undated, dated])?.id).toBe('dated')
  })
})

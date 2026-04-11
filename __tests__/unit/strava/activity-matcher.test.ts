import { matchActivity, getWeekBounds, findPendingBrickSession } from '@/lib/strava/activity-matcher'
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

// ── findPendingBrickSession ────────────────────────────────────────────────────

describe('findPendingBrickSession', () => {
  const ACTIVITY_DATE = '2026-04-01' // Wednesday — week: Mon 30 Mar – Sun 5 Apr

  it('returns a brick session scheduled in the same week', () => {
    const brick = makeSession({ session_type: 'brick', scheduled_date: '2026-04-02' })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE)).toBe(brick)
  })

  it('returns null when there are no sessions', () => {
    expect(findPendingBrickSession([], ACTIVITY_DATE)).toBeNull()
  })

  it('returns null when the only brick session is already completed', () => {
    const brick = makeSession({ session_type: 'brick', scheduled_date: '2026-04-02', completed: true })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE)).toBeNull()
  })

  it('returns null when the brick session is in a different week', () => {
    const brick = makeSession({ session_type: 'brick', scheduled_date: '2026-04-08' }) // next week
    expect(findPendingBrickSession([brick], ACTIVITY_DATE)).toBeNull()
  })

  it('returns null when the only session in the week is not a brick', () => {
    const run = makeSession({ session_type: 'run', scheduled_date: '2026-04-02' })
    expect(findPendingBrickSession([run], ACTIVITY_DATE)).toBeNull()
  })

  it('returns null when brick session has no scheduled_date', () => {
    const brick = makeSession({ session_type: 'brick', scheduled_date: null })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE)).toBeNull()
  })

  it('returns the earliest brick session when multiple are in the same week', () => {
    const later = makeSession({ id: 'brick-late', session_type: 'brick', scheduled_date: '2026-04-03' })
    const earlier = makeSession({ id: 'brick-early', session_type: 'brick', scheduled_date: '2026-03-30' })
    expect(findPendingBrickSession([later, earlier], ACTIVITY_DATE)?.id).toBe('brick-early')
  })

  it('ignores non-brick sessions alongside a valid brick session', () => {
    const run = makeSession({ id: 'run', session_type: 'run', scheduled_date: '2026-04-01' })
    const brick = makeSession({ id: 'brick', session_type: 'brick', scheduled_date: '2026-04-02' })
    expect(findPendingBrickSession([run, brick], ACTIVITY_DATE)?.id).toBe('brick')
  })
})

// ── findPendingBrickSession — combined stats validation ───────────────────────

describe('findPendingBrickSession — combined stats validation', () => {
  const ACTIVITY_DATE = '2026-04-02' // Thursday

  function makeBrick(overrides: Partial<Session> = {}): Session {
    return makeSession({
      id: 'brick-1',
      session_type: 'brick',
      scheduled_date: ACTIVITY_DATE,
      target_distance_km: 50,
      target_duration_minutes: null,
      ...overrides,
    })
  }

  it('does not apply threshold when no combined stats are provided', () => {
    // First leg arrival — just checks a brick session exists, no stats check
    const brick = makeBrick({ target_distance_km: 50 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE)).toBe(brick)
  })

  it('matches when combined distance meets exactly 85% of target', () => {
    const brick = makeBrick({ target_distance_km: 50 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, 42.5)).toBe(brick)
  })

  it('matches when combined distance exceeds the target', () => {
    const brick = makeBrick({ target_distance_km: 50 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, 55)).toBe(brick)
  })

  it('returns null when combined distance is below 85% of target', () => {
    const brick = makeBrick({ target_distance_km: 50 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, 42)).toBeNull()
  })

  it('matches when combined duration meets exactly 85% of target (no distance target)', () => {
    const brick = makeBrick({ target_distance_km: null, target_duration_minutes: 90 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, undefined, 76.5)).toBe(brick)
  })

  it('returns null when combined duration is below 85% of target (no distance target)', () => {
    const brick = makeBrick({ target_distance_km: null, target_duration_minutes: 90 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, undefined, 76)).toBeNull()
  })

  it('ignores duration threshold when distance target is also set', () => {
    // When both targets are set, only distance is checked
    const brick = makeBrick({ target_distance_km: 50, target_duration_minutes: 90 })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, 43, 10)).toBe(brick)
  })

  it('skips the threshold check for sessions with no distance or duration target', () => {
    // A brick with only a description target (no numeric thresholds) should always match
    const brick = makeBrick({ target_distance_km: null, target_duration_minutes: null })
    expect(findPendingBrickSession([brick], ACTIVITY_DATE, 5, 20)).toBe(brick)
  })
})

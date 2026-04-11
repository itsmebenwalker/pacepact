/**
 * Unit tests for the webhook processing logic (lib/strava/webhook.ts).
 *
 * Tests cover:
 *  - Multi-group activity matching via matchActivity + findPendingBrickSession
 *  - isRealRide / isRealRun classification helpers
 *  - Brick batch detection (ride + run = brick, Workout/Transition excluded)
 */

import type { Session, StravaActivity } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    scheduled_date: '2026-04-01',
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
    type: 'run',
    sport_type: 'run',
    distance: 10000,
    moving_time: 3600,
    elapsed_time: 3600,
    start_date: '2026-04-01T07:00:00Z',
    start_date_local: '2026-04-01T08:00:00',
    athlete: { id: 999 },
    ...overrides,
  }
}

// ── Multi-group matching ───────────────────────────────────────────────────────

import { matchActivity, findPendingBrickSession } from '@/lib/strava/activity-matcher'

describe('multi-group activity matching logic', () => {
  it('matches one session per group when the user is in multiple groups', () => {
    const activity = makeActivity()

    const sessionsGroup1: Session[] = [
      makeSession({ id: 'g1-sess-1', group_id: 'group-1', scheduled_date: '2026-03-30' }),
      makeSession({ id: 'g1-sess-2', group_id: 'group-1', scheduled_date: '2026-04-02' }),
    ]
    const sessionsGroup2: Session[] = [
      makeSession({ id: 'g2-sess-1', group_id: 'group-2', scheduled_date: '2026-03-31' }),
    ]

    expect(matchActivity(activity, sessionsGroup1)?.id).toBe('g1-sess-1')
    expect(matchActivity(activity, sessionsGroup2)?.id).toBe('g2-sess-1')
  })

  it('only credits groups that have a matching session type', () => {
    const activity = makeActivity({ type: 'run', sport_type: 'run' })
    const runSession = makeSession({ id: 'run-sess', group_id: 'group-1', session_type: 'run' })
    const rideSession = makeSession({ id: 'ride-sess', group_id: 'group-2', session_type: 'ride' })

    expect(matchActivity(activity, [runSession])).toBe(runSession)
    expect(matchActivity(activity, [rideSession])).toBeNull()
  })

  it('credits group-1 even when group-2 has no qualifying sessions', () => {
    const activity = makeActivity()
    const sessionG1 = makeSession({ id: 'g1', group_id: 'group-1' })
    const sessionG2 = makeSession({ id: 'g2', group_id: 'group-2', completed: true })

    expect(matchActivity(activity, [sessionG1])).toBe(sessionG1)
    expect(matchActivity(activity, [sessionG2])).toBeNull()
  })

  it('grouping all pending sessions by group_id produces per-group buckets', () => {
    const allSessions: Session[] = [
      makeSession({ id: 'g1-a', group_id: 'group-1', scheduled_date: '2026-03-30' }),
      makeSession({ id: 'g1-b', group_id: 'group-1', scheduled_date: '2026-04-02' }),
      makeSession({ id: 'g2-a', group_id: 'group-2', scheduled_date: '2026-03-31' }),
      makeSession({ id: 'g3-a', group_id: 'group-3', scheduled_date: '2026-04-01' }),
    ]

    const byGroup = new Map<string, Session[]>()
    for (const s of allSessions) {
      const bucket = byGroup.get(s.group_id) ?? []
      bucket.push(s)
      byGroup.set(s.group_id, bucket)
    }

    expect(byGroup.size).toBe(3)
    expect(byGroup.get('group-1')).toHaveLength(2)

    const activity = makeActivity()
    const matches = []
    for (const [, sessions] of byGroup) {
      const m = matchActivity(activity, sessions)
      if (m) matches.push(m)
    }

    expect(matches).toHaveLength(3)
    expect(matches.find((m) => m.group_id === 'group-1')?.id).toBe('g1-a')
  })
})

// ── Brick batch detection: isRealRide / isRealRun ─────────────────────────────

import { isRealRide, isRealRun } from '@/lib/strava/webhook'

describe('isRealRide', () => {
  it('returns true for Ride', () => {
    expect(isRealRide(makeActivity({ type: 'Ride', sport_type: 'Ride' }))).toBe(true)
  })

  it('returns true for VirtualRide', () => {
    expect(isRealRide(makeActivity({ type: 'VirtualRide', sport_type: 'VirtualRide' }))).toBe(true)
  })

  it('returns false for Run', () => {
    expect(isRealRide(makeActivity({ type: 'Run', sport_type: 'Run' }))).toBe(false)
  })

  it('returns false for Workout (transition segment)', () => {
    expect(isRealRide(makeActivity({ type: 'Workout', sport_type: 'Workout' }))).toBe(false)
  })

  it('returns false for Transition', () => {
    expect(isRealRide(makeActivity({ type: 'Transition', sport_type: 'Transition' }))).toBe(false)
  })
})

describe('isRealRun', () => {
  it('returns true for Run', () => {
    expect(isRealRun(makeActivity({ type: 'Run', sport_type: 'Run' }))).toBe(true)
  })

  it('returns true for VirtualRun', () => {
    expect(isRealRun(makeActivity({ type: 'VirtualRun', sport_type: 'VirtualRun' }))).toBe(true)
  })

  it('returns false for Ride', () => {
    expect(isRealRun(makeActivity({ type: 'Ride', sport_type: 'Ride' }))).toBe(false)
  })

  it('returns false for Workout (transition segment)', () => {
    expect(isRealRun(makeActivity({ type: 'Workout', sport_type: 'Workout' }))).toBe(false)
  })

  it('returns false for Transition', () => {
    expect(isRealRun(makeActivity({ type: 'Transition', sport_type: 'Transition' }))).toBe(false)
  })
})

// ── Brick batch classification ────────────────────────────────────────────────

describe('brick batch classification', () => {
  it('detects a brick batch when there is one ride and one run', () => {
    const ride = makeActivity({ type: 'Ride', sport_type: 'Ride' })
    const run = makeActivity({ type: 'Run', sport_type: 'Run' })
    const rides = [ride].filter(isRealRide)
    const runs = [run].filter(isRealRun)
    expect(rides.length >= 1 && runs.length >= 1).toBe(true)
  })

  it('does not detect a brick when a Workout transition is the only other activity alongside a ride', () => {
    const ride = makeActivity({ type: 'Ride', sport_type: 'Ride' })
    const transition = makeActivity({ type: 'Workout', sport_type: 'Workout' })
    const activities = [ride, transition]
    const rides = activities.filter(isRealRide)
    const runs = activities.filter(isRealRun)
    expect(rides.length >= 1 && runs.length >= 1).toBe(false)
  })

  it('does not detect a brick when a Transition segment accompanies a ride', () => {
    const ride = makeActivity({ type: 'Ride', sport_type: 'Ride' })
    const transition = makeActivity({ type: 'Transition', sport_type: 'Transition' })
    const activities = [ride, transition]
    const rides = activities.filter(isRealRide)
    const runs = activities.filter(isRealRun)
    expect(rides.length >= 1 && runs.length >= 1).toBe(false)
  })

  it('detects a brick even when a Workout transition is also present', () => {
    const ride = makeActivity({ type: 'Ride', sport_type: 'Ride' })
    const transition = makeActivity({ type: 'Workout', sport_type: 'Workout' })
    const run = makeActivity({ type: 'Run', sport_type: 'Run' })
    const activities = [ride, transition, run]
    const rides = activities.filter(isRealRide)
    const runs = activities.filter(isRealRun)
    expect(rides.length >= 1 && runs.length >= 1).toBe(true)
  })

  it('does not detect a brick from a standalone run', () => {
    const run = makeActivity({ type: 'Run', sport_type: 'Run' })
    const rides = [run].filter(isRealRide)
    const runs = [run].filter(isRealRun)
    expect(rides.length >= 1 && runs.length >= 1).toBe(false)
  })
})

// ── Brick session matching ────────────────────────────────────────────────────

describe('brick session matching via findPendingBrickSession', () => {
  const BRICK_DATE = '2026-04-02'

  function makeBrickSession(overrides: Partial<Session> = {}): Session {
    return makeSession({
      id: 'brick-1',
      session_type: 'brick',
      target_distance_km: null,
      target_duration_minutes: 90,
      target_description: 'Brick: 40km ride + 5km run',
      scheduled_date: BRICK_DATE,
      ...overrides,
    })
  }

  it('matchActivity does not match a brick session to a ride', () => {
    const brick = makeBrickSession()
    const ride = makeActivity({ type: 'Ride', sport_type: 'Ride', start_date_local: `${BRICK_DATE}T08:00:00` })
    expect(matchActivity(ride, [brick])).toBeNull()
  })

  it('matchActivity does not match a brick session to a run', () => {
    const brick = makeBrickSession()
    const run = makeActivity({ type: 'Run', sport_type: 'Run', start_date_local: `${BRICK_DATE}T08:00:00` })
    expect(matchActivity(run, [brick])).toBeNull()
  })

  it('findPendingBrickSession finds the brick when the week matches', () => {
    const brick = makeBrickSession()
    expect(findPendingBrickSession([brick], BRICK_DATE)).toBe(brick)
  })

  it('findPendingBrickSession returns null for a completed brick', () => {
    const brick = makeBrickSession({ completed: true })
    expect(findPendingBrickSession([brick], BRICK_DATE)).toBeNull()
  })

  it('matchActivity claims a run session normally, leaving the brick session intact', () => {
    const run = makeSession({ id: 'run-1', session_type: 'run', scheduled_date: BRICK_DATE })
    const brick = makeBrickSession()
    const activity = makeActivity({ type: 'run', sport_type: 'run', start_date_local: `${BRICK_DATE}T08:00:00` })
    expect(matchActivity(activity, [run, brick])?.id).toBe('run-1')
  })
})

import { calculatePoints, mapStravaType } from '@/lib/points/calculator'
import type { Session, StravaActivity } from '@/types'

// Fixed Monday date for early-bonus tests
const MONDAY = '2026-03-02'
const TUESDAY = '2026-03-03'
const WEDNESDAY = '2026-03-04'
const SUNDAY = '2026-03-08'

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
    scheduled_date: WEDNESDAY,
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
    distance: 10000, // 10 km in metres
    moving_time: 3600,
    elapsed_time: 3600, // 60 min
    start_date: '2026-03-04T07:00:00Z',
    start_date_local: '2026-03-04T08:00:00',
    athlete: { id: 999 },
    ...overrides,
  }
}

describe('mapStravaType', () => {
  it.each([
    ['Run', 'run'],
    ['VirtualRun', 'run'],
    ['Ride', 'ride'],
    ['VirtualRide', 'ride'],
    ['Swim', 'swim'],
    ['Workout', 'run'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapStravaType(input)).toBe(expected)
  })

  it('lowercases unknown types', () => {
    expect(mapStravaType('NordicSki')).toBe('nordicski')
  })
})

describe('calculatePoints — base', () => {
  it('awards 10 base points for a standard completion', () => {
    const result = calculatePoints(makeSession(), makeActivity(), false)
    expect(result.base).toBe(10)
    expect(result.total).toBe(10)
  })
})

describe('calculatePoints — early bonus', () => {
  it('awards +2 for a session scheduled on Monday', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: MONDAY }),
      makeActivity(),
      false
    )
    expect(result.early_bonus).toBe(2)
    expect(result.total).toBe(12)
  })

  it('awards +2 for a session scheduled on Tuesday', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: TUESDAY }),
      makeActivity(),
      false
    )
    expect(result.early_bonus).toBe(2)
    expect(result.total).toBe(12)
  })

  it('does not award early bonus for Wednesday', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: WEDNESDAY }),
      makeActivity(),
      false
    )
    expect(result.early_bonus).toBe(0)
  })

  it('does not award early bonus for Sunday', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: SUNDAY }),
      makeActivity(),
      false
    )
    expect(result.early_bonus).toBe(0)
  })

  it('does not award early bonus when scheduled_date is null', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: null }),
      makeActivity(),
      false
    )
    expect(result.early_bonus).toBe(0)
  })
})

describe('calculatePoints — exceed bonus', () => {
  it('awards +3 when activity distance exceeds target by >10%', () => {
    // target 10 km, activity 11.1 km (11.1% over)
    const result = calculatePoints(
      makeSession({ target_distance_km: 10 }),
      makeActivity({ distance: 11100 }),
      false
    )
    expect(result.exceed_bonus).toBe(3)
    expect(result.total).toBe(13)
  })

  it('does not award exceed bonus when exactly 10% over (not strictly greater)', () => {
    // exactly 10% over = 11 km
    const result = calculatePoints(
      makeSession({ target_distance_km: 10 }),
      makeActivity({ distance: 11000 }),
      false
    )
    expect(result.exceed_bonus).toBe(0)
  })

  it('does not award exceed bonus when under target', () => {
    const result = calculatePoints(
      makeSession({ target_distance_km: 10 }),
      makeActivity({ distance: 9500 }),
      false
    )
    expect(result.exceed_bonus).toBe(0)
  })

  it('awards +3 when duration exceeds target by >10% and no distance target', () => {
    // target 60 min, activity 67 min (11.7% over)
    const result = calculatePoints(
      makeSession({ target_distance_km: null, target_duration_minutes: 60 }),
      makeActivity({ elapsed_time: 4020 }), // 67 min
      false
    )
    expect(result.exceed_bonus).toBe(3)
  })

  it('only checks duration when distance target is not set', () => {
    // Both targets set — code checks distance first (else-if).
    // Distance not exceeded → falls to duration check → duration exceeded → +3
    const result = calculatePoints(
      makeSession({ target_distance_km: 10, target_duration_minutes: 60 }),
      makeActivity({ distance: 9000, elapsed_time: 4020 }), // distance short, duration over
      false
    )
    // The else-if means duration bonus can still fire when distance wasn't exceeded
    expect(result.exceed_bonus).toBe(3)
  })

  it('does not award exceed bonus when both distance and duration are under target', () => {
    const result = calculatePoints(
      makeSession({ target_distance_km: 10, target_duration_minutes: 60 }),
      makeActivity({ distance: 9000, elapsed_time: 3000 }),
      false
    )
    expect(result.exceed_bonus).toBe(0)
  })
})

describe('calculatePoints — streak bonus', () => {
  it('awards +5 when streak is active', () => {
    const result = calculatePoints(makeSession(), makeActivity(), true)
    expect(result.streak_bonus).toBe(5)
    expect(result.total).toBe(15)
  })

  it('does not award streak bonus when streak is inactive', () => {
    const result = calculatePoints(makeSession(), makeActivity(), false)
    expect(result.streak_bonus).toBe(0)
  })
})

describe('calculatePoints — combined bonuses', () => {
  it('stacks all bonuses correctly (10 + 2 + 3 + 5 = 20)', () => {
    const result = calculatePoints(
      makeSession({ scheduled_date: MONDAY, target_distance_km: 10 }),
      makeActivity({ distance: 11500 }), // >10% over
      true // streak active
    )
    expect(result.base).toBe(10)
    expect(result.early_bonus).toBe(2)
    expect(result.exceed_bonus).toBe(3)
    expect(result.streak_bonus).toBe(5)
    expect(result.total).toBe(20)
  })
})

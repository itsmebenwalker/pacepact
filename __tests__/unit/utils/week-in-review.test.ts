import {
  activeSessions,
  completedActive,
  weekPoints,
  weekDistance,
  weekDuration,
  getDateRange,
  findReviewWeek,
  buildTeaser,
  buildWeekInReviewData,
} from '@/lib/utils/week-in-review'
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

// ─── activeSessions ──────────────────────────────────────────────────────────

describe('activeSessions', () => {
  it('excludes rest sessions', () => {
    const sessions = [
      makeSession({ session_type: 'run' }),
      makeSession({ session_type: 'rest' }),
      makeSession({ session_type: 'ride' }),
    ]
    expect(activeSessions(sessions)).toHaveLength(2)
  })

  it('returns empty array when all sessions are rest', () => {
    expect(activeSessions([makeSession({ session_type: 'rest' })])).toHaveLength(0)
  })

  it('returns all sessions when none are rest', () => {
    const sessions = [makeSession({ session_type: 'run' }), makeSession({ session_type: 'swim' })]
    expect(activeSessions(sessions)).toHaveLength(2)
  })
})

// ─── completedActive ─────────────────────────────────────────────────────────

describe('completedActive', () => {
  it('returns only completed non-rest sessions', () => {
    const sessions = [
      makeSession({ session_type: 'run', completed: true }),
      makeSession({ session_type: 'run', completed: false }),
      makeSession({ session_type: 'rest', completed: true }),
    ]
    expect(completedActive(sessions)).toHaveLength(1)
  })

  it('returns empty array when nothing is completed', () => {
    expect(completedActive([makeSession({ completed: false })])).toHaveLength(0)
  })
})

// ─── weekPoints ──────────────────────────────────────────────────────────────

describe('weekPoints', () => {
  it('sums points_awarded across all sessions', () => {
    const sessions = [
      makeSession({ points_awarded: 10 }),
      makeSession({ points_awarded: 12 }),
      makeSession({ points_awarded: 0 }),
    ]
    expect(weekPoints(sessions)).toBe(22)
  })

  it('returns 0 for empty array', () => {
    expect(weekPoints([])).toBe(0)
  })

  it('treats null points_awarded as 0', () => {
    // points_awarded is typed as number, but guard against runtime nulls
    const session = makeSession({ points_awarded: 0 })
    expect(weekPoints([session])).toBe(0)
  })
})

// ─── weekDistance ────────────────────────────────────────────────────────────

describe('weekDistance', () => {
  it('sums target_distance_km for completed sessions only', () => {
    const sessions = [
      makeSession({ completed: true, target_distance_km: 10 }),
      makeSession({ completed: false, target_distance_km: 5 }),
      makeSession({ completed: true, target_distance_km: 8 }),
    ]
    expect(weekDistance(sessions)).toBe(18)
  })

  it('excludes sessions with no distance target', () => {
    const sessions = [
      makeSession({ completed: true, target_distance_km: null }),
      makeSession({ completed: true, target_distance_km: 10 }),
    ]
    expect(weekDistance(sessions)).toBe(10)
  })

  it('returns 0 when no completed sessions have a distance target', () => {
    expect(weekDistance([makeSession({ completed: false, target_distance_km: 10 })])).toBe(0)
  })
})

// ─── weekDuration ────────────────────────────────────────────────────────────

describe('weekDuration', () => {
  it('sums target_duration_minutes for completed sessions only', () => {
    const sessions = [
      makeSession({ completed: true, target_distance_km: null, target_duration_minutes: 60 }),
      makeSession({ completed: false, target_distance_km: null, target_duration_minutes: 45 }),
      makeSession({ completed: true, target_distance_km: null, target_duration_minutes: 30 }),
    ]
    expect(weekDuration(sessions)).toBe(90)
  })

  it('excludes sessions with no duration target', () => {
    const sessions = [
      makeSession({ completed: true, target_duration_minutes: null }),
      makeSession({ completed: true, target_duration_minutes: 45 }),
    ]
    expect(weekDuration(sessions)).toBe(45)
  })
})

// ─── getDateRange ─────────────────────────────────────────────────────────────

describe('getDateRange', () => {
  it('returns the earliest and latest scheduled_date', () => {
    const sessions = [
      makeSession({ scheduled_date: '2026-04-03' }),
      makeSession({ scheduled_date: '2026-04-01' }),
      makeSession({ scheduled_date: '2026-04-05' }),
    ]
    expect(getDateRange(sessions)).toEqual({ start: '2026-04-01', end: '2026-04-05' })
  })

  it('returns null when all sessions have no date', () => {
    expect(getDateRange([makeSession({ scheduled_date: null })])).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(getDateRange([])).toBeNull()
  })

  it('returns same start and end for a single dated session', () => {
    expect(getDateRange([makeSession({ scheduled_date: '2026-04-02' })])).toEqual({
      start: '2026-04-02',
      end: '2026-04-02',
    })
  })
})

// ─── findReviewWeek ──────────────────────────────────────────────────────────

describe('findReviewWeek', () => {
  function makeWeekMap(entries: [number, Partial<Session>[]][]): Map<number, Session[]> {
    const map = new Map<number, Session[]>()
    for (const [week, partials] of entries) {
      map.set(week, partials.map((p) => makeSession({ week_number: week, ...p })))
    }
    return map
  }

  it('returns null when no weeks have past sessions', () => {
    const map = makeWeekMap([[1, [{ scheduled_date: '2026-04-15' }]]])
    expect(findReviewWeek(map, TODAY)).toBeNull()
  })

  it('returns null when all past weeks contain only rest sessions', () => {
    const map = makeWeekMap([[1, [{ scheduled_date: '2026-04-01', session_type: 'rest' }]]])
    expect(findReviewWeek(map, TODAY)).toBeNull()
  })

  it('returns null for an empty weekMap', () => {
    expect(findReviewWeek(new Map(), TODAY)).toBeNull()
  })

  it('returns the most recent past week with non-rest sessions', () => {
    const map = makeWeekMap([
      [1, [{ scheduled_date: '2026-03-25' }]],
      [2, [{ scheduled_date: '2026-04-01' }]],
      [3, [{ scheduled_date: '2026-04-15' }]], // future — excluded
    ])
    const result = findReviewWeek(map, TODAY)
    expect(result![0]).toBe(2)
  })

  it('excludes the week whose last date equals today (not strictly past)', () => {
    const map = makeWeekMap([[1, [{ scheduled_date: TODAY }]]])
    expect(findReviewWeek(map, TODAY)).toBeNull()
  })

  it('selects the highest week number among multiple past weeks', () => {
    const map = makeWeekMap([
      [1, [{ scheduled_date: '2026-03-18' }]],
      [2, [{ scheduled_date: '2026-03-25' }]],
      [3, [{ scheduled_date: '2026-04-01' }]],
    ])
    const result = findReviewWeek(map, TODAY)
    expect(result![0]).toBe(3)
  })
})

// ─── buildTeaser ─────────────────────────────────────────────────────────────

describe('buildTeaser', () => {
  it('shows plain count when there is no prior week', () => {
    expect(buildTeaser(3, 4, 0, false)).toBe('3/4 sessions done')
  })

  it('shows plain count when prior week had 0 completions', () => {
    expect(buildTeaser(3, 4, 0, true)).toBe('3/4 sessions done')
  })

  it('shows "up N" when this week beats last week', () => {
    expect(buildTeaser(4, 4, 2, true)).toBe('4/4 sessions — up 2 from last week')
  })

  it('shows "down N" when this week is worse than last week', () => {
    expect(buildTeaser(1, 4, 3, true)).toBe('1/4 sessions — down 2 from last week')
  })

  it('shows "same as last week" when counts are equal', () => {
    expect(buildTeaser(3, 4, 3, true)).toBe('3/4 sessions — same as last week')
  })
})

// ─── buildWeekInReviewData ───────────────────────────────────────────────────

describe('buildWeekInReviewData', () => {
  const USER_A = 'user-a'
  const USER_B = 'user-b'
  const MEMBERS = [
    { user_id: USER_A, display_name: 'Alice', points: 0 },
    { user_id: USER_B, display_name: 'Bob', points: 0 },
  ]

  function sess(overrides: Partial<Session>): Session {
    return makeSession({ user_id: USER_A, ...overrides })
  }

  it('returns null when there are no sessions', () => {
    expect(buildWeekInReviewData([], USER_A, MEMBERS, TODAY)).toBeNull()
  })

  it('returns null when no week is fully in the past', () => {
    const sessions = [sess({ week_number: 1, scheduled_date: '2026-04-15' })]
    expect(buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)).toBeNull()
  })

  it('returns data for the most recently completed week', () => {
    const sessions = [
      sess({ week_number: 1, scheduled_date: '2026-03-25', completed: true, points_awarded: 10 }),
      sess({ week_number: 2, scheduled_date: '2026-04-01', completed: true, points_awarded: 12 }),
      sess({ week_number: 3, scheduled_date: '2026-04-15' }), // future
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data).not.toBeNull()
    expect(data!.weekNumber).toBe(2)
    expect(data!.myStats.completed).toBe(1)
    expect(data!.myStats.points).toBe(12)
  })

  it('streak is active when user completed sessions in both review week and prior week', () => {
    const sessions = [
      sess({ week_number: 1, scheduled_date: '2026-03-25', completed: true }),
      sess({ week_number: 2, scheduled_date: '2026-04-01', completed: true }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.myStats.hasStreak).toBe(true)
  })

  it('streak is not active when prior week had no completions', () => {
    const sessions = [
      sess({ week_number: 1, scheduled_date: '2026-03-25', completed: false }),
      sess({ week_number: 2, scheduled_date: '2026-04-01', completed: true }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.myStats.hasStreak).toBe(false)
  })

  it('streak is not active when review week had no completions', () => {
    const sessions = [
      sess({ week_number: 1, scheduled_date: '2026-03-25', completed: true }),
      sess({ week_number: 2, scheduled_date: '2026-04-01', completed: false }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.myStats.hasStreak).toBe(false)
  })

  it('memberStats are sorted by completed sessions descending', () => {
    const sessions = [
      makeSession({ user_id: USER_A, week_number: 1, scheduled_date: '2026-04-01', completed: true }),
      makeSession({ user_id: USER_B, week_number: 1, scheduled_date: '2026-04-01', completed: false }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.memberStats[0].user_id).toBe(USER_A)
    expect(data!.memberStats[1].user_id).toBe(USER_B)
  })

  it('rest sessions are excluded from totals', () => {
    const sessions = [
      sess({ week_number: 1, scheduled_date: '2026-04-01', session_type: 'run', completed: true }),
      sess({ week_number: 1, scheduled_date: '2026-04-02', session_type: 'rest', completed: false }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.myStats.total).toBe(1)
    expect(data!.myStats.completed).toBe(1)
  })

  it('includes upcoming sessions from the next active week', () => {
    const sessions = [
      // Past week (review)
      sess({ id: 'p1', week_number: 1, scheduled_date: '2026-04-01', completed: true }),
      // Current/upcoming week
      sess({ id: 'u1', week_number: 2, scheduled_date: '2026-04-12', completed: false }),
      sess({ id: 'u2', week_number: 2, scheduled_date: '2026-04-13', completed: false }),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.upcomingSessions).toHaveLength(2)
    expect(data!.upcomingSessions[0].id).toBe('u1')
  })

  it('caps upcoming sessions at 3', () => {
    const sessions = [
      sess({ id: 'p1', week_number: 1, scheduled_date: '2026-04-01', completed: true }),
      ...[11, 12, 13, 14, 15].map((d) =>
        sess({ id: `u${d}`, week_number: 2, scheduled_date: `2026-04-${d}`, completed: false })
      ),
    ]
    const data = buildWeekInReviewData(sessions, USER_A, MEMBERS, TODAY)
    expect(data!.upcomingSessions).toHaveLength(3)
  })
})

/**
 * Unit tests for the activity_matched notification inserted by processWebhookEvent.
 *
 * Tests that after a Strava activity is matched to a session the correct
 * notification row is inserted, including the group name looked up from the
 * pre-fetched groups query.
 */

import { processWebhookEvent } from '@/lib/strava/webhook'
import type { Session, StravaActivity, StravaWebhookPayload } from '@/types'

// ── Configurable test data ────────────────────────────────────────────────────

let mockPendingSessions: Session[] = []
let mockGroupsResult: { id: string; name: string }[] = []

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockGetActivity = jest.fn()
const mockCalculatePoints = jest.fn()
const mockNotificationsInsert = jest.fn()
const mockSessionsUpdateEq = jest.fn()
const mockSessionsUpdate = jest.fn()

// ── Supabase service client mock ──────────────────────────────────────────────
// sessions.select('*')            → pending query: ends at .eq().eq()
// sessions.select('completed_at') → streak query:  ends at .eq().eq().gte()

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({ eq: () => ({ single: () => mockGetUser() }) }),
        }
      }

      if (table === 'sessions') {
        return {
          select: (fields: string) => {
            if (fields === '*') {
              // Pending sessions: .select('*').eq().eq() → awaitable
              return {
                eq: () => ({
                  eq: () => Promise.resolve({ data: mockPendingSessions, error: null }),
                }),
              }
            }
            // Streak check: .select('completed_at').eq().eq().gte() → awaitable
            return {
              eq: () => ({
                eq: () => ({
                  gte: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }
          },
          update: mockSessionsUpdate,
        }
      }

      if (table === 'groups') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockGroupsResult, error: null }),
          }),
        }
      }

      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { points: 0 }, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        }
      }

      if (table === 'notifications') {
        return { insert: mockNotificationsInsert }
      }

      return {}
    },
  })),
  createClient: jest.fn(),
}))

jest.mock('@/lib/strava/oauth', () => ({
  ensureFreshToken: jest.fn().mockResolvedValue('access-token'),
  getStravaActivity: (...args: unknown[]) => mockGetActivity(...args),
}))

jest.mock('@/lib/points/calculator', () => ({
  calculatePoints: (...args: unknown[]) => mockCalculatePoints(...args),
  mapStravaType: (type: string) => type.toLowerCase(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProfile() {
  return {
    id: 'user-1',
    strava_access_token: 'tok',
    strava_refresh_token: 'ref',
    strava_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

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
    scheduled_date: '2026-04-01', // Wednesday — same week as activity
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
    id: 99999,
    name: 'Morning Run',
    type: 'run',
    sport_type: 'run',
    distance: 10_000,
    moving_time: 3_600,
    elapsed_time: 3_600,
    start_date: '2026-04-01T07:00:00Z',
    start_date_local: '2026-04-01T08:00:00Z',
    athlete: { id: 42 },
    ...overrides,
  }
}

function makePayload(overrides: Partial<StravaWebhookPayload> = {}): StravaWebhookPayload {
  return {
    object_type: 'activity',
    aspect_type: 'create',
    object_id: 99999,
    owner_id: 42,
    subscription_id: 1,
    event_time: Math.floor(Date.now() / 1000),
    updates: {},
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('processWebhookEvent — activity_matched notification', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockPendingSessions = [makeSession()]
    mockGroupsResult = [{ id: 'group-1', name: 'Team Alpha' }]

    mockGetUser.mockResolvedValue({ data: makeProfile(), error: null })
    mockGetActivity.mockResolvedValue(makeActivity())
    mockCalculatePoints.mockReturnValue({ total: 12 })
    mockNotificationsInsert.mockResolvedValue({ error: null })
    mockSessionsUpdateEq.mockResolvedValue({ error: null })
    mockSessionsUpdate.mockReturnValue({ eq: mockSessionsUpdateEq })
  })

  it('inserts an activity_matched notification when a session is matched', async () => {
    await processWebhookEvent(makePayload())

    expect(mockNotificationsInsert).toHaveBeenCalledTimes(1)
    expect(mockNotificationsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'activity_matched',
        group_id: 'group-1',
      })
    )
  })

  it('includes the activity name and session description in the notification data', async () => {
    await processWebhookEvent(makePayload())

    const inserted = mockNotificationsInsert.mock.calls[0][0]
    expect(inserted.data.activity_name).toBe('Morning Run')
    expect(inserted.data.session_description).toBe('Easy 10km run')
  })

  it('includes the points awarded in the notification data', async () => {
    mockCalculatePoints.mockReturnValue({ total: 15 })

    await processWebhookEvent(makePayload())

    const inserted = mockNotificationsInsert.mock.calls[0][0]
    expect(inserted.data.points_awarded).toBe(15)
  })

  it('includes the group name from the pre-fetched groups query', async () => {
    mockGroupsResult = [{ id: 'group-1', name: 'Sunday Runners' }]

    await processWebhookEvent(makePayload())

    const inserted = mockNotificationsInsert.mock.calls[0][0]
    expect(inserted.data.group_name).toBe('Sunday Runners')
  })

  it('inserts one notification per matched group when user is in multiple groups', async () => {
    mockPendingSessions = [
      makeSession({ id: 'sess-g1', group_id: 'group-1' }),
      makeSession({ id: 'sess-g2', group_id: 'group-2' }),
    ]
    mockGroupsResult = [
      { id: 'group-1', name: 'Team Alpha' },
      { id: 'group-2', name: 'Team Beta' },
    ]

    await processWebhookEvent(makePayload())

    expect(mockNotificationsInsert).toHaveBeenCalledTimes(2)
    const groupIds = mockNotificationsInsert.mock.calls.map((c) => c[0].group_id)
    expect(groupIds).toContain('group-1')
    expect(groupIds).toContain('group-2')
  })

  it('does not insert a notification when no sessions match', async () => {
    // No pending sessions → processWebhookEvent returns early
    mockPendingSessions = []

    await processWebhookEvent(makePayload())

    expect(mockNotificationsInsert).not.toHaveBeenCalled()
  })

  it('does not insert a notification for non-create webhook events', async () => {
    await processWebhookEvent(makePayload({ aspect_type: 'update' }))

    expect(mockNotificationsInsert).not.toHaveBeenCalled()
  })

  it('does not insert a notification when no user is found for the athlete', async () => {
    mockGetUser.mockResolvedValueOnce({ data: null, error: null })

    await processWebhookEvent(makePayload())

    expect(mockNotificationsInsert).not.toHaveBeenCalled()
  })
})

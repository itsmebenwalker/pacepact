/**
 * Integration tests for POST /api/activities/assign
 * Assigns a parked brick leg to a standalone session.
 */

import { POST } from '@/app/api/activities/assign/route'

// ── Shared mock state ─────────────────────────────────────────────────────────

let mockGetUser: jest.Mock
let mockGetPart: jest.Mock
let mockGetCandidates: jest.Mock
let mockGetMember: jest.Mock
let mockGetGroup: jest.Mock

const mockSessionsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
const mockMembersUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) })
const mockNotificationsInsert = jest.fn().mockResolvedValue({ error: null })
const mockPartsDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

beforeEach(() => {
  mockGetUser = jest.fn()
  mockGetPart = jest.fn()
  mockGetCandidates = jest.fn()
  mockGetMember = jest.fn()
  mockGetGroup = jest.fn()
})

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
  createServiceClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'brick_activity_parts') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: () => mockGetPart() }) }) }),
          delete: () => ({ eq: mockPartsDelete }),
        }
      }
      if (table === 'sessions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => ({
                      lte: () => ({
                        order: () => mockGetCandidates(),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: mockSessionsUpdate,
        }
      }
      if (table === 'group_members') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: () => mockGetMember() }) }) }),
          update: mockMembersUpdate,
        }
      }
      if (table === 'groups') {
        return {
          select: () => ({ eq: () => ({ single: () => mockGetGroup() }) }),
        }
      }
      if (table === 'notifications') {
        return { insert: mockNotificationsInsert }
      }
      return {}
    },
  })),
}))

jest.mock('@/lib/strava/webhook', () => ({
  checkStreak: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/points/calculator', () => ({
  calculatePoints: jest.fn().mockReturnValue({ total: 10 }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('https://app.com/api/activities/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makePart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part-1',
    user_id: 'user-1',
    group_id: 'group-1',
    external_id: 'garmin_ping_AAA',
    activity_type: 'ride',
    strava_activity_id: 12345,
    activity_name: '40km Ride',
    activity_date: '2026-04-02',
    distance_km: 40,
    duration_minutes: 75,
    created_at: '2026-04-02T10:00:00Z',
    ...overrides,
  }
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    group_id: 'group-1',
    user_id: 'user-1',
    session_type: 'ride',
    target_distance_km: 40,
    target_duration_minutes: null,
    target_description: '40km steady ride',
    scheduled_date: '2026-04-02',
    completed: false,
    points_awarded: 0,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/activities/assign', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest({ brick_part_id: 'part-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when brick_part_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the part is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await POST(makeRequest({ brick_part_id: 'part-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when no matching session exists for the week', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart(), error: null })
    mockGetCandidates.mockResolvedValue({ data: [], error: null })
    const res = await POST(makeRequest({ brick_part_id: 'part-1' }))
    expect(res.status).toBe(404)
  })

  it('completes the session, awards points, and deletes the part', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart(), error: null })
    mockGetCandidates.mockResolvedValue({ data: [makeSession()], error: null })
    mockGetMember.mockResolvedValue({ data: { points: 20 }, error: null })
    mockGetGroup.mockResolvedValue({ data: { name: 'Test Group' }, error: null })

    const res = await POST(makeRequest({ brick_part_id: 'part-1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSessionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, points_awarded: 10 })
    )
    expect(mockPartsDelete).toHaveBeenCalledWith('id', 'part-1')
  })
})

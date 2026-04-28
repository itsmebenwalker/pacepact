/**
 * Integration tests for POST /api/activities/assign and DELETE /api/activities/assign.
 * Assigns a parked brick leg to a standalone session.
 */

import { POST } from '@/app/api/activities/assign/route'

// ── Shared mock state ─────────────────────────────────────────────────────────

let mockGetUser: jest.Mock
let mockGetPart: jest.Mock
let mockGetCandidates: jest.Mock
let mockGetSpecificSession: jest.Mock
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
  mockGetSpecificSession = jest.fn()
  mockGetMember = jest.fn()
  mockGetGroup = jest.fn()
  mockSessionsUpdate.mockClear()
  mockSessionsUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
})

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: jest.fn(async () => {
    const result = await mockGetUser()
    const user = result?.data?.user ?? null
    if (!user) return { user: null, supabase: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
    return { user, supabase: {}, error: null }
  }),
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
          // Flat fluent chain — terminates at either .single() (specific session path)
          // or .order() (candidates path), whichever the route calls.
          select: () => {
            const chain: Record<string, unknown> = {}
            const fluent = () => chain
            chain.eq = fluent
            chain.gte = fluent
            chain.lte = fluent
            chain.order = () => mockGetCandidates()
            chain.single = () => mockGetSpecificSession()
            return chain
          },
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

// ── Tests: no session_id (legacy / fallback path) ────────────────────────────

describe('POST /api/activities/assign — no session_id (fallback to earliest)', () => {
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

  it('assigns to the earliest-scheduled candidate when multiple exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run', activity_date: '2026-04-02' }), error: null })

    const earlierSession = makeSession({ id: 'sess-early', session_type: 'run', scheduled_date: '2026-04-02' })
    const laterSession = makeSession({ id: 'sess-late', session_type: 'run', scheduled_date: '2026-04-04' })
    mockGetCandidates.mockResolvedValue({ data: [earlierSession, laterSession], error: null })
    mockGetMember.mockResolvedValue({ data: { points: 0 }, error: null })
    mockGetGroup.mockResolvedValue({ data: { name: 'Test Group' }, error: null })

    const res = await POST(makeRequest({ brick_part_id: 'part-1' }))
    expect(res.status).toBe(200)

    expect(mockSessionsUpdate).toHaveBeenCalledTimes(1)
    const updateEq = mockSessionsUpdate.mock.results[0].value.eq
    expect(updateEq).toHaveBeenCalledWith('id', 'sess-early')
    expect(updateEq).not.toHaveBeenCalledWith('id', 'sess-late')
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

// ── Tests: with session_id (user-selected session) ───────────────────────────

describe('POST /api/activities/assign — with session_id (user-selected)', () => {
  it('assigns to the specified session when it is valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run' }), error: null })
    mockGetSpecificSession.mockResolvedValue({ data: makeSession({ id: 'sess-chosen', session_type: 'run' }), error: null })
    mockGetMember.mockResolvedValue({ data: { points: 0 }, error: null })
    mockGetGroup.mockResolvedValue({ data: { name: 'Test Group' }, error: null })

    const res = await POST(makeRequest({ brick_part_id: 'part-1', session_id: 'sess-chosen' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    // Should update the chosen session, not fallback to candidates
    const updateEq = mockSessionsUpdate.mock.results[0].value.eq
    expect(updateEq).toHaveBeenCalledWith('id', 'sess-chosen')
    // Candidates query should not have been called
    expect(mockGetCandidates).not.toHaveBeenCalled()
  })

  it('returns 404 when the specified session is not found (wrong owner, wrong group, or already completed)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run' }), error: null })
    mockGetSpecificSession.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(makeRequest({ brick_part_id: 'part-1', session_id: 'sess-other-user' }))
    expect(res.status).toBe(404)
  })

  it('does not fall through to the candidate query when session_id is provided but invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run' }), error: null })
    mockGetSpecificSession.mockResolvedValue({ data: null, error: null })

    const res = await POST(makeRequest({ brick_part_id: 'part-1', session_id: 'sess-bad' }))

    expect(res.status).toBe(404)
    expect(mockGetCandidates).not.toHaveBeenCalled()
  })

  it('awards points and deletes the part after assigning to a specified session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run', distance_km: 5, duration_minutes: 30 }), error: null })
    mockGetSpecificSession.mockResolvedValue({
      data: makeSession({ id: 'sess-5k', session_type: 'run', target_distance_km: 5, target_description: 'Easy run with strides' }),
      error: null,
    })
    mockGetMember.mockResolvedValue({ data: { points: 10 }, error: null })
    mockGetGroup.mockResolvedValue({ data: { name: 'Test Group' }, error: null })

    const res = await POST(makeRequest({ brick_part_id: 'part-1', session_id: 'sess-5k' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSessionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, points_awarded: 10 })
    )
    expect(mockPartsDelete).toHaveBeenCalledWith('id', 'part-1')
  })

  it('inserts a notification with the correct session description', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetPart.mockResolvedValue({ data: makePart({ activity_type: 'run', activity_name: 'Morning Run' }), error: null })
    mockGetSpecificSession.mockResolvedValue({
      data: makeSession({ id: 'sess-5k', session_type: 'run', target_description: 'Easy run with strides' }),
      error: null,
    })
    mockGetMember.mockResolvedValue({ data: { points: 0 }, error: null })
    mockGetGroup.mockResolvedValue({ data: { name: 'Tri Squad' }, error: null })

    await POST(makeRequest({ brick_part_id: 'part-1', session_id: 'sess-5k' }))

    expect(mockNotificationsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activity_name: 'Morning Run',
          session_description: 'Easy run with strides',
          group_name: 'Tri Squad',
        }),
      })
    )
  })
})

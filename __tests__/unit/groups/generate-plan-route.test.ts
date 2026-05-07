/**
 * Tests for POST /api/groups/generate-plan and the underlying createGroup helper.
 *
 * Key behaviours verified:
 *  - Group is created immediately with plan_status 'generating' and groupId returned
 *    without waiting for Claude (synchronous path is fast).
 *  - The new other_sport / other_distance_km columns are persisted so a retry
 *    can rebuild the prompt.
 *  - after() is called once to schedule background plan generation, which is
 *    delegated to tryRunPlanGeneration (the retry-aware module).
 *  - Validation: 400 for missing required fields.
 *
 * Plan generation, retries, fan-out, notifications, and the failure-email path
 * are tested separately in plan-generation.test.ts.
 */

// ── Mock setup ────────────────────────────────────────────────────────────────
// Variables that start with 'mock' are hoisted alongside jest.mock() calls.

const mockRequireAuth = jest.fn()
const mockCreateServiceClient = jest.fn()
const mockAfter = jest.fn()
const mockTryRunPlanGeneration = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: mockRequireAuth,
  createServiceClient: mockCreateServiceClient,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    }),
  },
  after: mockAfter,
}))

jest.mock('nanoid', () => ({ nanoid: () => 'test1234' }))

jest.mock('@/lib/groups/plan-generation', () => ({
  tryRunPlanGeneration: mockTryRunPlanGeneration,
}))

// Import AFTER mocks so the route picks up the mocked dependencies
import { POST } from '@/app/api/groups/generate-plan/route'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-456' }

const MOCK_GROUP = {
  id: 'group-123',
  name: 'Test Group',
  event_name: 'Test Marathon',
  event_type: 'marathon',
  event_date: '2026-10-01',
  ambition: 'finish',
  training_plan: [],
  plan_status: 'generating',
  invite_code: 'test1234',
  created_by: 'user-456',
  created_at: '2026-04-23T00:00:00Z',
}

const VALID_BODY = {
  name: 'Test Group',
  event_name: 'Test Marathon',
  event_type: 'marathon',
  event_date: '2026-10-01',
  ambition: 'finish',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type MockResponse = { _data: Record<string, unknown>; _status: number }

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/groups/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDb() {
  const mockSingle = jest.fn().mockResolvedValue({ data: MOCK_GROUP, error: null })
  const mockSelect = jest.fn(() => ({ single: mockSingle }))
  const mockGroupInsert = jest.fn(() => ({ select: mockSelect }))
  const mockMembersInsert = jest.fn().mockResolvedValue({ data: null, error: null })

  const mockFrom = jest.fn((table: string) => {
    if (table === 'groups') return { insert: mockGroupInsert }
    if (table === 'group_members') return { insert: mockMembersInsert }
    return {}
  })

  return { client: { from: mockFrom }, mockFrom, mockGroupInsert, mockMembersInsert }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/groups/generate-plan', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => {
    jest.resetAllMocks()
    db = makeDb()
    mockRequireAuth.mockResolvedValue({ user: MOCK_USER, supabase: {}, error: null })
    mockCreateServiceClient.mockReturnValue(db.client)
    mockTryRunPlanGeneration.mockResolvedValue(undefined)
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ name: 'Test' })) as unknown as MockResponse
    expect(res._status).toBe(400)
    expect(db.mockGroupInsert).not.toHaveBeenCalled()
  })

  it('returns 400 for other event type without sport and distance', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, event_type: 'other' })) as unknown as MockResponse
    expect(res._status).toBe(400)
  })

  // ── Synchronous path ───────────────────────────────────────────────────────

  it('creates the group with plan_status generating before the background task runs', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(db.mockGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan_status: 'generating', training_plan: [] })
    )
    expect(mockTryRunPlanGeneration).not.toHaveBeenCalled()
  })

  it('persists other_sport and other_distance_km when provided', async () => {
    await POST(makeRequest({
      ...VALID_BODY,
      event_type: 'other',
      other_sport: 'cycling',
      other_distance_km: '120',
    }))

    expect(db.mockGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        other_sport: 'cycling',
        other_distance_km: 120,
      })
    )
  })

  it('persists null other fields for non-other event types', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(db.mockGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        other_sport: null,
        other_distance_km: null,
      })
    )
  })

  it('adds the creator to group_members immediately', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(db.mockMembersInsert).toHaveBeenCalledWith(
      expect.objectContaining({ group_id: MOCK_GROUP.id, user_id: MOCK_USER.id })
    )
  })

  it('returns groupId in the response without waiting for plan generation', async () => {
    const res = await POST(makeRequest(VALID_BODY)) as unknown as MockResponse
    expect(res._status).toBe(200)
    expect(res._data.groupId).toBe(MOCK_GROUP.id)
  })

  it('schedules background work via after() exactly once', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockAfter).toHaveBeenCalledWith(expect.any(Function))
  })

  // ── Background task ────────────────────────────────────────────────────────

  it('background task delegates to tryRunPlanGeneration with the new groupId', async () => {
    await POST(makeRequest(VALID_BODY))
    const bgTask = mockAfter.mock.calls[0][0] as () => Promise<void>
    await bgTask()

    expect(mockTryRunPlanGeneration).toHaveBeenCalledWith(MOCK_GROUP.id)
  })
})

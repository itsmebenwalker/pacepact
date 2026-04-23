/**
 * Tests for POST /api/groups/generate-plan.
 *
 * Key behaviours verified:
 *  - Group is created immediately with plan_status 'generating' and groupId returned
 *    without waiting for Claude (synchronous path is fast).
 *  - after() is called once to schedule the background task.
 *  - Background task: generates plan, updates group to 'ready', fans out sessions,
 *    inserts a plan_ready notification.
 *  - Background task: on error, updates group to 'failed' instead.
 *  - Validation: 400 for missing required fields.
 */

import type { TrainingSession } from '@/types'

// ── Mock setup ────────────────────────────────────────────────────────────────
// Variables that start with 'mock' are hoisted alongside jest.mock() calls.

const mockRequireAuth = jest.fn()
const mockCreateServiceClient = jest.fn()
const mockAfter = jest.fn()
const mockGenerateTrainingPlan = jest.fn()
const mockFanOutSessionsForUser = jest.fn()

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

jest.mock('@/lib/claude/generate-plan', () => ({
  generateTrainingPlan: mockGenerateTrainingPlan,
}))

jest.mock('@/lib/groups/fan-out', () => ({
  fanOutSessionsForUser: mockFanOutSessionsForUser,
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

const MOCK_SESSIONS: TrainingSession[] = [
  {
    week_number: 1,
    session_type: 'run',
    target_distance_km: 5,
    target_duration_minutes: null,
    target_description: 'Easy 5km run',
    day_of_week: 1,
    tip: 'Keep a conversational pace.',
  },
]

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
  const mockEq = jest.fn().mockResolvedValue({ data: null, error: null })
  const mockUpdate = jest.fn(() => ({ eq: mockEq }))
  const mockMembersInsert = jest.fn().mockResolvedValue({ data: null, error: null })
  const mockNotifInsert = jest.fn().mockResolvedValue({ data: null, error: null })

  const mockFrom = jest.fn((table: string) => {
    if (table === 'groups') return { insert: mockGroupInsert, update: mockUpdate }
    if (table === 'group_members') return { insert: mockMembersInsert }
    if (table === 'notifications') return { insert: mockNotifInsert }
    return {}
  })

  return { client: { from: mockFrom }, mockFrom, mockGroupInsert, mockMembersInsert, mockUpdate, mockEq, mockNotifInsert }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/groups/generate-plan', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => {
    jest.resetAllMocks()
    db = makeDb()
    mockRequireAuth.mockResolvedValue({ user: MOCK_USER, supabase: {}, error: null })
    mockCreateServiceClient.mockReturnValue(db.client)
    mockGenerateTrainingPlan.mockResolvedValue({ sessions: MOCK_SESSIONS, raw: JSON.stringify(MOCK_SESSIONS) })
    mockFanOutSessionsForUser.mockResolvedValue(undefined)
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

  it('creates the group with plan_status generating before Claude is called', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(db.mockGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan_status: 'generating', training_plan: [] })
    )
    expect(mockGenerateTrainingPlan).not.toHaveBeenCalled()
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

  async function runBackground() {
    await POST(makeRequest(VALID_BODY))
    const bgTask = mockAfter.mock.calls[0][0] as () => Promise<void>
    await bgTask()
  }

  it('background: calls generateTrainingPlan with the correct event details', async () => {
    await runBackground()

    expect(mockGenerateTrainingPlan).toHaveBeenCalledWith(
      VALID_BODY.event_type,
      VALID_BODY.event_date,
      VALID_BODY.ambition,
      undefined,
      undefined
    )
  })

  it('background: updates group to plan_status ready with the generated sessions', async () => {
    await runBackground()

    expect(db.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan_status: 'ready', training_plan: MOCK_SESSIONS })
    )
    expect(db.mockEq).toHaveBeenCalledWith('id', MOCK_GROUP.id)
  })

  it('background: fans out sessions to the group creator', async () => {
    await runBackground()

    expect(mockFanOutSessionsForUser).toHaveBeenCalledWith(
      db.client,
      expect.objectContaining({ id: MOCK_GROUP.id, training_plan: MOCK_SESSIONS }),
      MOCK_USER.id
    )
  })

  it('background: inserts a plan_ready notification for the creator', async () => {
    await runBackground()

    expect(db.mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: MOCK_USER.id,
        type: 'plan_ready',
        group_id: MOCK_GROUP.id,
        data: expect.objectContaining({ group_name: VALID_BODY.name }),
      })
    )
  })

  it('background: sets plan_status to failed when Claude throws', async () => {
    mockGenerateTrainingPlan.mockRejectedValue(new Error('Claude error'))

    await runBackground()

    expect(db.mockUpdate).toHaveBeenCalledWith({ plan_status: 'failed' })
  })
})

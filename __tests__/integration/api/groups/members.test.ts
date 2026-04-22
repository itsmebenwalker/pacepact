/**
 * Integration tests for group member admin actions:
 *   DELETE /api/groups/[groupId]/members/[userId]  — kick + auto-ban
 *   PATCH  /api/groups/[groupId]/members/[userId]  — transfer creator
 */

import { DELETE, PATCH } from '@/app/api/groups/[groupId]/members/[userId]/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockGroupSelect = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: jest.fn(async () => {
    const { data: { user } } = await mockGetUser()
    if (!user) return { user: null, supabase: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
    return {
      user,
      supabase: { from: (table: string) => table === 'groups' ? mockGroupSelect : {} },
      error: null,
    }
  }),
  createServiceClient: jest.fn(() => ({
    from: mockServiceFrom,
  })),
}))

// Service-client mock — shared state reset per test via beforeEach
let mockMemberCheck: jest.Mock
let mockMemberDelete: jest.Mock
let mockBanInsert: jest.Mock
let mockSessionsDelete: jest.Mock
let mockBrickPartsDelete: jest.Mock
let mockGroupTransfer: jest.Mock

function mockServiceFrom(table: string) {
  if (table === 'group_members') {
    return {
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mockMemberCheck }) }) }),
      delete: () => ({ eq: () => ({ eq: () => mockMemberDelete() }) }),
    }
  }
  if (table === 'group_member_bans') {
    return { insert: mockBanInsert }
  }
  if (table === 'sessions') {
    return { delete: () => ({ eq: () => ({ eq: () => mockSessionsDelete() }) }) }
  }
  if (table === 'brick_activity_parts') {
    return { delete: () => ({ eq: () => ({ eq: () => mockBrickPartsDelete() }) }) }
  }
  if (table === 'groups') {
    return { update: () => ({ eq: mockGroupTransfer }) }
  }
  return {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(groupId = 'group-1', userId = 'target-user') {
  return { params: Promise.resolve({ groupId, userId }) }
}

function makeDeleteRequest(groupId = 'group-1', userId = 'target-user') {
  return [
    new Request(`https://app.com/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
    makeParams(groupId, userId),
  ] as const
}

function makePatchRequest(
  body: Record<string, unknown>,
  groupId = 'group-1',
  userId = 'target-user'
) {
  return [
    new Request(`https://app.com/api/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    makeParams(groupId, userId),
  ] as const
}

const CREATOR = { id: 'creator-user' }
const CREATOR_GROUP = { created_by: 'creator-user' }
const MEMBER_ROW = { id: 'member-row-id' }

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  mockMemberCheck = jest.fn().mockResolvedValue({ data: MEMBER_ROW, error: null })
  mockMemberDelete = jest.fn().mockResolvedValue({ error: null })
  mockBanInsert = jest.fn().mockResolvedValue({ error: null })
  mockSessionsDelete = jest.fn().mockResolvedValue({ error: null })
  mockBrickPartsDelete = jest.fn().mockResolvedValue({ error: null })
  mockGroupTransfer = jest.fn().mockResolvedValue({ error: null })

  mockGetUser.mockResolvedValue({ data: { user: CREATOR } })
  mockGroupSelect.single.mockResolvedValue({ data: CREATOR_GROUP })
})

// ── DELETE (kick + ban) ───────────────────────────────────────────────────────

describe('DELETE /api/groups/[groupId]/members/[userId]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(401)
  })

  it('returns 404 when group not found', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({ data: null })
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } } })
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to kick yourself', async () => {
    const res = await DELETE(...makeDeleteRequest('group-1', 'creator-user'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when target is not a member', async () => {
    mockMemberCheck.mockResolvedValueOnce({ data: null, error: null })
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(404)
  })

  it('deletes the group_members row', async () => {
    await DELETE(...makeDeleteRequest())
    expect(mockMemberDelete).toHaveBeenCalled()
  })

  it('inserts a ban record after kicking', async () => {
    await DELETE(...makeDeleteRequest())
    expect(mockBanInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: 'group-1',
        user_id: 'target-user',
        banned_by: 'creator-user',
      })
    )
  })

  it('returns 200 with { ok: true } on success', async () => {
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('deletes sessions for the kicked user in the group', async () => {
    await DELETE(...makeDeleteRequest())
    expect(mockSessionsDelete).toHaveBeenCalled()
  })

  it('deletes brick_activity_parts for the kicked user in the group', async () => {
    await DELETE(...makeDeleteRequest())
    expect(mockBrickPartsDelete).toHaveBeenCalled()
  })

  it('returns 500 when the member delete fails', async () => {
    mockMemberDelete.mockResolvedValueOnce({ error: new Error('DB error') })
    const res = await DELETE(...makeDeleteRequest())
    expect(res.status).toBe(500)
  })
})

// ── PATCH (transfer creator) ──────────────────────────────────────────────────

describe('PATCH /api/groups/[groupId]/members/[userId] — make_creator', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown action', async () => {
    const res = await PATCH(...makePatchRequest({ action: 'something_else' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when group not found', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({ data: null })
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } } })
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to transfer to yourself', async () => {
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }, 'group-1', 'creator-user'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when target is not a member', async () => {
    mockMemberCheck.mockResolvedValueOnce({ data: null, error: null })
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(404)
  })

  it('updates groups.created_by to the target user', async () => {
    await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(mockGroupTransfer).toHaveBeenCalledWith('id', 'group-1')
  })

  it('returns 200 with { ok: true } on success', async () => {
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 500 when the groups update fails', async () => {
    mockGroupTransfer.mockResolvedValueOnce({ error: new Error('DB error') })
    const res = await PATCH(...makePatchRequest({ action: 'make_creator' }))
    expect(res.status).toBe(500)
  })
})

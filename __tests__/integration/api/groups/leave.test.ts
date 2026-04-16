/**
 * Integration tests for DELETE /api/groups/[groupId]/members/me
 * Allows an authenticated non-creator member to leave a group.
 */

import { DELETE } from '@/app/api/groups/[groupId]/members/me/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockGroupSelect = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: (table: string) => {
        if (table === 'groups') return mockGroupSelect
        return {}
      },
    })
  ),
  createServiceClient: jest.fn(() => ({
    from: mockServiceFrom,
  })),
}))

let mockMemberCheck: jest.Mock
let mockMemberDelete: jest.Mock

function mockServiceFrom(table: string) {
  if (table === 'group_members') {
    return {
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mockMemberCheck }) }) }),
      delete: () => ({ eq: () => ({ eq: () => mockMemberDelete() }) }),
    }
  }
  return {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(groupId = 'group-1') {
  return [
    new Request(`https://app.com/api/groups/${groupId}/members/me`, { method: 'DELETE' }),
    { params: Promise.resolve({ groupId }) },
  ] as const
}

const MEMBER = { id: 'member-user' }
const CREATOR = { id: 'creator-user' }
const NON_CREATOR_GROUP = { created_by: 'creator-user' }
const MEMBER_ROW = { id: 'member-row-id' }

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockMemberCheck = jest.fn().mockResolvedValue({ data: MEMBER_ROW, error: null })
  mockMemberDelete = jest.fn().mockResolvedValue({ error: null })
  mockGetUser.mockResolvedValue({ data: { user: MEMBER } })
  mockGroupSelect.single.mockResolvedValue({ data: NON_CREATOR_GROUP })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/groups/[groupId]/members/me', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 404 when group not found', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({ data: null })
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller is the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: CREATOR } })
    mockGroupSelect.single.mockResolvedValueOnce({ data: { created_by: 'creator-user' } })
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/transfer admin rights/)
  })

  it('returns 404 when the caller is not a member', async () => {
    mockMemberCheck.mockResolvedValueOnce({ data: null, error: null })
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(404)
  })

  it('deletes the group_members row for the current user', async () => {
    await DELETE(...makeRequest())
    expect(mockMemberDelete).toHaveBeenCalled()
  })

  it('returns 200 with { ok: true } on success', async () => {
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 500 when the delete fails', async () => {
    mockMemberDelete.mockResolvedValueOnce({ error: new Error('DB error') })
    const res = await DELETE(...makeRequest())
    expect(res.status).toBe(500)
  })
})

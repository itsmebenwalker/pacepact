/**
 * Integration tests for creator-only group admin actions via
 * PATCH /api/groups/[groupId]:
 *   action: 'rotate_invite'       — regenerates the invite code
 *   action: 'toggle_invite_lock'  — flips invite_locked on the group
 *   action: 'update_members_cap'  — increases the member limit (increase-only)
 */

import { PATCH } from '@/app/api/groups/[groupId]/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockGroupSelect = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockGroupUpdate = jest.fn()

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
    from: () => ({ update: mockGroupUpdate }),
  })),
}))

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'new-code-12') }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(groupId = 'group-1') {
  return { params: Promise.resolve({ groupId }) }
}

function makeRequest(body: Record<string, unknown>, groupId = 'group-1') {
  return [
    new Request(`https://app.com/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    makeParams(groupId),
  ] as const
}

const CREATOR = { id: 'creator-user' }

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: CREATOR } })
  mockGroupSelect.single.mockResolvedValue({
    data: { created_by: 'creator-user', invite_locked: false },
  })
  mockGroupUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
})

// ── rotate_invite ─────────────────────────────────────────────────────────────

describe("PATCH /api/groups/[groupId] — action: 'rotate_invite'", () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await PATCH(...makeRequest({ action: 'rotate_invite' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when group not found', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({ data: null })
    const res = await PATCH(...makeRequest({ action: 'rotate_invite' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } } })
    const res = await PATCH(...makeRequest({ action: 'rotate_invite' }))
    expect(res.status).toBe(403)
  })

  it('updates the invite_code with the new nanoid value', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    mockGroupUpdate.mockReturnValueOnce({ eq: mockEq })

    await PATCH(...makeRequest({ action: 'rotate_invite' }))

    expect(mockGroupUpdate).toHaveBeenCalledWith({ invite_code: 'new-code-12' })
    expect(mockEq).toHaveBeenCalledWith('id', 'group-1')
  })

  it('returns 200 with ok and the new invite_code', async () => {
    const res = await PATCH(...makeRequest({ action: 'rotate_invite' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.invite_code).toBe('new-code-12')
  })

  it('returns 500 when the update fails', async () => {
    mockGroupUpdate.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: new Error('DB error') }) })
    const res = await PATCH(...makeRequest({ action: 'rotate_invite' }))
    expect(res.status).toBe(500)
  })
})

// ── toggle_invite_lock ────────────────────────────────────────────────────────

describe("PATCH /api/groups/[groupId] — action: 'toggle_invite_lock'", () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await PATCH(...makeRequest({ action: 'toggle_invite_lock' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } } })
    const res = await PATCH(...makeRequest({ action: 'toggle_invite_lock' }))
    expect(res.status).toBe(403)
  })

  it('sets invite_locked to true when currently false', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({
      data: { created_by: 'creator-user', invite_locked: false },
    })
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    mockGroupUpdate.mockReturnValueOnce({ eq: mockEq })

    const res = await PATCH(...makeRequest({ action: 'toggle_invite_lock' }))

    expect(mockGroupUpdate).toHaveBeenCalledWith({ invite_locked: true })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invite_locked).toBe(true)
  })

  it('sets invite_locked to false when currently true', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({
      data: { created_by: 'creator-user', invite_locked: true },
    })
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    mockGroupUpdate.mockReturnValueOnce({ eq: mockEq })

    const res = await PATCH(...makeRequest({ action: 'toggle_invite_lock' }))

    expect(mockGroupUpdate).toHaveBeenCalledWith({ invite_locked: false })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invite_locked).toBe(false)
  })

  it('returns 500 when the update fails', async () => {
    mockGroupUpdate.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: new Error('DB error') }) })
    const res = await PATCH(...makeRequest({ action: 'toggle_invite_lock' }))
    expect(res.status).toBe(500)
  })
})

// ── update_members_cap ────────────────────────────────────────────────────────

describe("PATCH /api/groups/[groupId] — action: 'update_members_cap'", () => {
  beforeEach(() => {
    mockGroupSelect.single.mockResolvedValue({
      data: { created_by: 'creator-user', invite_locked: false, members_cap: 20 },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 30 }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when group not found', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({ data: null })
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 30 }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the group creator', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } } })
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 30 }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when members_cap is not a number', async () => {
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 'thirty' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when members_cap is a float', async () => {
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 25.5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when members_cap is less than 1', async () => {
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when new cap equals the current cap', async () => {
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 20 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/only be increased/i)
  })

  it('returns 400 when new cap is lower than the current cap', async () => {
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 10 }))
    expect(res.status).toBe(400)
  })

  it('allows setting a cap when the current cap is null', async () => {
    mockGroupSelect.single.mockResolvedValueOnce({
      data: { created_by: 'creator-user', invite_locked: false, members_cap: null },
    })
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    mockGroupUpdate.mockReturnValueOnce({ eq: mockEq })

    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 50 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.members_cap).toBe(50)
  })

  it('writes the new members_cap to the database', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    mockGroupUpdate.mockReturnValueOnce({ eq: mockEq })

    await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 50 }))

    expect(mockGroupUpdate).toHaveBeenCalledWith({ members_cap: 50 })
    expect(mockEq).toHaveBeenCalledWith('id', 'group-1')
  })

  it('returns 200 with ok and the new members_cap', async () => {
    mockGroupUpdate.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: null }) })

    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 50 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.members_cap).toBe(50)
  })

  it('returns 500 when the database update fails', async () => {
    mockGroupUpdate.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: new Error('DB error') }) })
    const res = await PATCH(...makeRequest({ action: 'update_members_cap', members_cap: 50 }))
    expect(res.status).toBe(500)
  })
})

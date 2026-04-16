/**
 * Integration tests for creator-only group admin actions via
 * PATCH /api/groups/[groupId]:
 *   action: 'rotate_invite'       — regenerates the invite code
 *   action: 'toggle_invite_lock'  — flips invite_locked on the group
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

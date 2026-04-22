/**
 * Integration tests for POST /api/notifications/read-all
 * Supabase client is mocked.
 */

import { POST } from '@/app/api/notifications/read-all/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockEqFinal = jest.fn()
const mockEqFirst = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: jest.fn(async () => {
    const { data: { user } } = await mockGetUser()
    if (!user) return { user: null, supabase: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
    return {
      user,
      supabase: { from: (table: string) => table === 'notifications' ? { update: mockUpdate } : {} },
      error: null,
    }
  }),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/notifications/read-all', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Chain: .update({ read: true }).eq('user_id', ...).eq('read', false)
    mockEqFinal.mockResolvedValue({ error: null })
    mockEqFirst.mockReturnValue({ eq: mockEqFinal })
    mockUpdate.mockReturnValue({ eq: mockEqFirst })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('marks all unread notifications as read for the authenticated user', async () => {
    const res = await POST()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockUpdate).toHaveBeenCalledWith({ read: true })
    expect(mockEqFirst).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockEqFinal).toHaveBeenCalledWith('read', false)
  })

  it('returns ok: true on success', async () => {
    const res = await POST()
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

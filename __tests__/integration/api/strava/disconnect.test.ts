/**
 * Integration tests for DELETE /api/strava/disconnect
 * Supabase clients and the Strava deauthorize endpoint are mocked.
 */

import { DELETE } from '@/app/api/strava/disconnect/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockProfileSelect = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockProfileUpdate = {
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue({ error: null }),
}

const mockUserFrom = jest.fn((table: string) => {
  if (table === 'profiles') return mockProfileSelect
  return {}
})
const mockServiceFrom = jest.fn(() => mockProfileUpdate)

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: jest.fn(async () => {
    const { data: { user } } = await mockGetUser()
    if (!user) return { user: null, supabase: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
    return { user, supabase: { from: mockUserFrom }, error: null }
  }),
  createServiceClient: jest.fn(() => ({
    from: mockServiceFrom,
  })),
}))

// ── Fetch mock (Strava deauthorize) ───────────────────────────────────────────

const mockFetch = jest.fn().mockResolvedValue({ ok: true })
global.fetch = mockFetch

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/strava/disconnect', () => {
  const AUTHED_USER = { id: 'user-uuid' }
  const CONNECTED_PROFILE = {
    strava_athlete_id: 12345,
    strava_access_token: 'strava-token-abc',
  }

  function makeRequest(): Request {
    return new Request('https://app.com/api/strava/disconnect', { method: 'DELETE' })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } })
    mockProfileSelect.single.mockResolvedValue({ data: CONNECTED_PROFILE })
    mockProfileUpdate.eq.mockResolvedValue({ error: null })
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('returns 401 when no user is authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const res = await DELETE(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 400 when Strava is not connected', async () => {
    mockProfileSelect.single.mockResolvedValueOnce({
      data: { strava_athlete_id: null, strava_access_token: null },
    })

    const res = await DELETE(makeRequest())
    expect(res.status).toBe(400)
  })

  it('calls Strava deauthorize with the access token', async () => {
    await DELETE(makeRequest())

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/deauthorize',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      })
    )
    const body = mockFetch.mock.calls[0][1].body as URLSearchParams
    expect(body.get('access_token')).toBe('strava-token-abc')
  })

  it('clears all Strava fields on the profile', async () => {
    await DELETE(makeRequest())

    expect(mockProfileUpdate.update).toHaveBeenCalledWith({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
    })
  })

  it('returns 200 with { ok: true } on success', async () => {
    const res = await DELETE(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('still clears the profile when the Strava deauthorize call fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const res = await DELETE(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockProfileUpdate.update).toHaveBeenCalled()
  })

  it('returns 500 when the Supabase profile update fails', async () => {
    mockProfileUpdate.eq.mockResolvedValueOnce({ error: new Error('DB error') })

    const res = await DELETE(makeRequest())
    expect(res.status).toBe(500)
  })
})

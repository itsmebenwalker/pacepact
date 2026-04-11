/**
 * Integration tests for PATCH /api/user/profile — notification preference fields.
 * Covers the fields added alongside the existing display_name field.
 * Supabase client is mocked.
 */

import { PATCH } from '@/app/api/user/profile/route'

// ── Supabase mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockEq = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: () => ({ update: mockUpdate }),
    })
  ),
  createServiceClient: jest.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return new Request('https://app.com/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const AUTHED_USER = { id: 'user-1' }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/user/profile — notification preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Chain: .update(fields).eq('id', userId)
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const res = await PATCH(makeRequest({ notify_admin_message: true }))
    expect(res.status).toBe(401)
  })

  it('updates notify_admin_message to true', async () => {
    const res = await PATCH(makeRequest({ notify_admin_message: true }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ notify_admin_message: true })
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('updates notify_admin_message to false', async () => {
    const res = await PATCH(makeRequest({ notify_admin_message: false }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ notify_admin_message: false })
  })

  it('updates notify_any_message to true', async () => {
    const res = await PATCH(makeRequest({ notify_any_message: true }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ notify_any_message: true })
  })

  it('updates notify_any_message to false', async () => {
    const res = await PATCH(makeRequest({ notify_any_message: false }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ notify_any_message: false })
  })

  it('updates display_name and a notification preference together', async () => {
    const res = await PATCH(makeRequest({ display_name: 'Alice', notify_admin_message: true }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      display_name: 'Alice',
      notify_admin_message: true,
    })
  })

  it('skips the DB update and returns ok when body has no recognised fields', async () => {
    const res = await PATCH(makeRequest({}))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 when display_name is an empty string', async () => {
    const res = await PATCH(makeRequest({ display_name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when display_name is whitespace only', async () => {
    const res = await PATCH(makeRequest({ display_name: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when the Supabase update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: new Error('DB error') })

    const res = await PATCH(makeRequest({ notify_any_message: true }))
    expect(res.status).toBe(500)
  })
})

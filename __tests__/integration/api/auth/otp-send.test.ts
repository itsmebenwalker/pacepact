/**
 * Integration tests for POST /api/auth/otp/send
 * Supabase admin and Resend are mocked.
 */

import { POST } from '@/app/api/auth/otp/send/route'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockGenerateLink: jest.Mock = jest.fn()
let mockListUsers: jest.Mock = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        generateLink: (...args: any[]) => mockGenerateLink(...args),
        listUsers: (...args: any[]) => mockListUsers(...args),
      },
    },
  })),
}))

let mockSendEmail: jest.Mock = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: any[]) => mockSendEmail(...args) },
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return new Request('https://app.com/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ACTION_LINK = 'https://supabase.co/auth/v1/verify?token=tok123&type=magiclink'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/otp/send', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com'
    process.env.RESEND_API_KEY = 'resend-key'

    mockListUsers.mockResolvedValue({
      data: { users: [{ email: 'user@example.com' }] },
      error: null,
    })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: ACTION_LINK } },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ id: 'email-id' })
  })

  it('returns 200 and sends email for a known email', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('calls listUsers with perPage:1 and the email as filter (targeted lookup)', async () => {
    await POST(makeRequest({ email: 'user@example.com' }))

    expect(mockListUsers).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: 1, filter: 'user@example.com' })
    )
  })

  it('returns 404 with an error message when email is not registered', async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null })

    const res = await POST(makeRequest({ email: 'unknown@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toMatch(/no account/i)
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it('returns 404 when listUsers returns a user with a different email (partial match guard)', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ email: 'other@example.com' }] },
      error: null,
    })

    const res = await POST(makeRequest({ email: 'unknown@example.com' }))
    expect(res.status).toBe(404)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('calls generateLink with magiclink type and the redirect URL', async () => {
    await POST(makeRequest({ email: 'user@example.com' }))

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'magiclink',
        email: 'user@example.com',
        options: expect.objectContaining({
          redirectTo: 'https://app.com/auth/callback',
        }),
      })
    )
  })

  it('passes display_name metadata when provided (signup)', async () => {
    await POST(makeRequest({ email: 'user@example.com', display_name: 'Alice' }))

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ data: { display_name: 'Alice' } }),
      })
    )
  })

  it('does not include data key when display_name is absent (login)', async () => {
    await POST(makeRequest({ email: 'user@example.com' }))

    const call = mockGenerateLink.mock.calls[0][0]
    expect(call.options).not.toHaveProperty('data')
  })

  it('skips the listUsers check for signup (display_name present)', async () => {
    await POST(makeRequest({ email: 'user@example.com', display_name: 'Alice' }))
    expect(mockListUsers).not.toHaveBeenCalled()
  })

  it('sends a signup-flavoured email when display_name is provided', async () => {
    await POST(makeRequest({ email: 'user@example.com', display_name: 'Alice' }))

    const emailArg = mockSendEmail.mock.calls[0][0]
    expect(emailArg.subject).toMatch(/creat/i)
    expect(emailArg.html).toContain('Create account')
  })

  it('sends a login-flavoured email when display_name is absent', async () => {
    await POST(makeRequest({ email: 'user@example.com' }))

    const emailArg = mockSendEmail.mock.calls[0][0]
    expect(emailArg.subject).toMatch(/sign in/i)
    expect(emailArg.html).toContain('Sign in')
  })

  it('includes the action_link in the email html', async () => {
    await POST(makeRequest({ email: 'user@example.com' }))

    const emailArg = mockSendEmail.mock.calls[0][0]
    expect(emailArg.html).toContain(ACTION_LINK)
  })

  it('returns 500 when listUsers returns an error', async () => {
    mockListUsers.mockResolvedValueOnce({ data: null, error: new Error('Supabase error') })

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it('returns 500 when Supabase generateLink fails', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: null },
      error: new Error('Supabase error'),
    })

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })
})

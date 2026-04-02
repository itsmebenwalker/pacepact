/**
 * Integration tests for POST /api/auth/otp/send
 * Supabase admin and Resend are mocked.
 */

import { POST } from '@/app/api/auth/otp/send/route'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockGenerateLink: jest.Mock = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        generateLink: (...args: any[]) => mockGenerateLink(...args),
      },
    },
  })),
}))

// Initialized in beforeEach; the factory closure defers the call so it's safe.
// eslint-disable-next-line prefer-const
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

    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: ACTION_LINK } },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ id: 'email-id' })
  })

  it('returns 200 and sends email for a valid login request', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
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
    await POST(makeRequest({ email: 'new@example.com', display_name: 'Alice' }))

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { display_name: 'Alice' },
        }),
      })
    )
  })

  it('does not include data key when display_name is absent (login)', async () => {
    await POST(makeRequest({ email: 'existing@example.com' }))

    const call = mockGenerateLink.mock.calls[0][0]
    expect(call.options).not.toHaveProperty('data')
  })

  it('sends a signup-flavoured email when display_name is provided', async () => {
    await POST(makeRequest({ email: 'new@example.com', display_name: 'Alice' }))

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

  it('returns 200 (without sending email) when Supabase returns an error', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: null },
      error: new Error('User not found'),
    })

    const res = await POST(makeRequest({ email: 'ghost@example.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })
})

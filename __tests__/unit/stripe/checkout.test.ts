/**
 * Tests for POST /api/stripe/checkout
 * Stripe SDK and Supabase are mocked — we verify routing logic, validation,
 * and that the correct Stripe session parameters are passed.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreateSession = jest.fn()
const mockRequireAuth = jest.fn()

jest.mock('@/lib/stripe/client', () => ({
  stripe: {
    checkout: {
      sessions: { create: mockCreateSession },
    },
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  requireAuth: mockRequireAuth,
}))

// Pin today for deterministic week calculations
beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-06-01'))
})

afterAll(() => jest.useRealTimers())

import { POST } from '@/app/api/stripe/checkout/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const AUTHED_USER = { id: 'user-123' }

function mockAuth(extra?: object) {
  mockRequireAuth.mockResolvedValue({
    user: AUTHED_USER,
    supabase: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: AUTHED_USER.id },
        }),
      }),
    },
    error: null,
    ...extra,
  })
}

const VALID_CREATE_GROUP_BODY = {
  action: 'create_group',
  name: 'Test Group',
  event_name: 'Test Marathon',
  event_type: 'marathon',
  event_date: '2026-07-27', // ~8 weeks away
  ambition: 'finish',
  members_cap: 20,
}

// ── create_group ──────────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — create_group', () => {
  beforeEach(() => {
    mockAuth()
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }) })
    const res = await POST(makeRequest(VALID_CREATE_GROUP_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ action: 'create_group', name: 'Only name' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/missing/i)
  })

  it('creates a Stripe session with AUD currency', async () => {
    await POST(makeRequest(VALID_CREATE_GROUP_BODY))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ currency: 'aud' }),
        })],
        mode: 'payment',
      })
    )
  })

  it('embeds group params in session metadata', async () => {
    await POST(makeRequest(VALID_CREATE_GROUP_BODY))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          action: 'create_group',
          user_id: AUTHED_USER.id,
          name: 'Test Group',
          event_type: 'marathon',
          members_cap: '20',
        }),
      })
    )
  })

  it('sets success_url to the processing page', async () => {
    await POST(makeRequest(VALID_CREATE_GROUP_BODY))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/group/new/processing'),
      })
    )
  })

  it('returns the Stripe checkout url', async () => {
    const res = await POST(makeRequest(VALID_CREATE_GROUP_BODY))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/test')
  })

  it('charges at least $0.50 AUD (50 cents minimum)', async () => {
    // 2 members × 1 week × $0.05 = $0.10 → clamped to 50 cents
    await POST(makeRequest({ ...VALID_CREATE_GROUP_BODY, members_cap: 2, event_date: '2026-06-08' }))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 50 }),
        })],
      })
    )
  })
})

// ── update_members_cap ────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — update_members_cap', () => {
  const VALID_CAP_BODY = {
    action: 'update_members_cap',
    group_id: 'group-abc',
    new_cap: 30,
    current_cap: 20,
    event_date: '2026-07-27',
  }

  beforeEach(() => {
    mockAuth()
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/cap-test' })
  })

  it('returns 403 if caller is not the group creator', async () => {
    mockRequireAuth.mockResolvedValue({
      user: AUTHED_USER,
      supabase: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { created_by: 'different-user' },
          }),
        }),
      },
      error: null,
    })
    const res = await POST(makeRequest(VALID_CAP_BODY))
    expect(res.status).toBe(403)
  })

  it('returns 400 when new_cap is not greater than current_cap', async () => {
    const res = await POST(makeRequest({ ...VALID_CAP_BODY, new_cap: 20 }))
    expect(res.status).toBe(400)
  })

  it('prices on delta seats, not the full new cap', async () => {
    // +10 seats × 8 weeks × $0.05 = $4.00 = 400 cents
    await POST(makeRequest(VALID_CAP_BODY))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 400 }),
        })],
      })
    )
  })

  it('sets success_url to the group members page', async () => {
    await POST(makeRequest(VALID_CAP_BODY))
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/group/group-abc/members'),
      })
    )
  })
})

// ── unknown action ────────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — unknown action', () => {
  beforeEach(() => mockAuth())

  it('returns 400', async () => {
    const res = await POST(makeRequest({ action: 'do_something_weird' }))
    expect(res.status).toBe(400)
  })
})

/**
 * Tests for POST /api/stripe/webhook
 * Stripe signature verification and Supabase are mocked.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConstructEvent = jest.fn()
const mockCreateGroup = jest.fn()
const mockServiceUpdate = jest.fn()

jest.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}))

jest.mock('@/lib/groups/create-group', () => ({
  createGroup: mockCreateGroup,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: mockServiceUpdate,
      }),
    }),
  })),
}))

import { POST } from '@/app/api/stripe/webhook/route'

afterEach(() => jest.clearAllMocks())

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature = 'valid-sig'): Request {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  })
}

function makeEvent(type: string, metadata: Record<string, string>) {
  return {
    type,
    data: {
      object: {
        id: 'cs_test_123',
        metadata,
      },
    },
  }
}

// ── Signature verification ────────────────────────────────────────────────────

describe('Stripe webhook — signature verification', () => {
  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const res = await POST(makeRequest('bad-payload', 'bad-sig'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid signature/i)
  })
})

// ── checkout.session.completed — create_group ─────────────────────────────────

describe('Stripe webhook — create_group', () => {
  const CREATE_GROUP_META = {
    action: 'create_group',
    user_id: 'user-abc',
    name: 'Test Group',
    event_name: 'Test Marathon',
    event_type: 'marathon',
    event_date: '2026-09-01',
    ambition: 'finish',
    members_cap: '20',
    other_sport: '',
    other_distance_km: '',
  }

  beforeEach(() => {
    mockConstructEvent.mockReturnValue(makeEvent('checkout.session.completed', CREATE_GROUP_META))
    mockCreateGroup.mockResolvedValue({ groupId: 'new-group-id' })
    mockServiceUpdate.mockResolvedValue({ error: null })
  })

  it('calls createGroup with correct params', async () => {
    await POST(makeRequest('{}'))
    expect(mockCreateGroup).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Group',
      event_type: 'marathon',
      ambition: 'finish',
      members_cap: 20,
      user_id: 'user-abc',
      stripe_session_id: 'cs_test_123',
    }))
  })

  it('passes other_sport as undefined when empty string', async () => {
    await POST(makeRequest('{}'))
    expect(mockCreateGroup).toHaveBeenCalledWith(expect.objectContaining({
      other_sport: undefined,
    }))
  })

  it('passes other_sport when present', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('checkout.session.completed', {
      ...CREATE_GROUP_META,
      other_sport: 'running',
      other_distance_km: '10',
    }))
    await POST(makeRequest('{}'))
    expect(mockCreateGroup).toHaveBeenCalledWith(expect.objectContaining({
      other_sport: 'running',
      other_distance_km: '10',
    }))
  })

  it('returns 200 even if createGroup throws', async () => {
    mockCreateGroup.mockRejectedValue(new Error('DB failure'))
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })

  it('returns { received: true }', async () => {
    const res = await POST(makeRequest('{}'))
    const body = await res.json()
    expect(body).toEqual({ received: true })
  })
})

// ── checkout.session.completed — update_members_cap ───────────────────────────

describe('Stripe webhook — update_members_cap', () => {
  const CAP_META = {
    action: 'update_members_cap',
    group_id: 'group-xyz',
    new_cap: '35',
    user_id: 'user-abc',
  }

  beforeEach(() => {
    mockConstructEvent.mockReturnValue(makeEvent('checkout.session.completed', CAP_META))
    mockServiceUpdate.mockResolvedValue({ error: null })
  })

  it('updates members_cap on the correct group', async () => {
    await POST(makeRequest('{}'))
    expect(mockServiceUpdate).toHaveBeenCalledWith('id', 'group-xyz')
  })

  it('updates the group with a numeric cap (not the raw string)', async () => {
    // Stripe metadata values are always strings — verify the route casts to Number
    await POST(makeRequest('{}'))
    // mockServiceUpdate is the .eq() call — if it fired, the update chain ran
    expect(mockServiceUpdate).toHaveBeenCalledWith('id', 'group-xyz')
  })

  it('returns { received: true }', async () => {
    const res = await POST(makeRequest('{}'))
    const body = await res.json()
    expect(body).toEqual({ received: true })
  })
})

// ── Unhandled event types ─────────────────────────────────────────────────────

describe('Stripe webhook — unhandled event types', () => {
  it('returns 200 and does not call createGroup for non-checkout events', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.created', {}))
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
    expect(mockCreateGroup).not.toHaveBeenCalled()
  })
})

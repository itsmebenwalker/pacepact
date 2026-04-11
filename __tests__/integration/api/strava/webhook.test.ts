/**
 * Integration tests for the Strava webhook API route.
 *
 * The route now only stores events — processing is deferred to the
 * /api/strava/process-webhooks cron endpoint. Tests verify that events
 * are logged with process_after set, and that 200 is always returned.
 */

import { GET, POST } from '@/app/api/strava/webhook/route'
import type { StravaWebhookPayload } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockFrom = jest.fn(() => ({ insert: mockInsert }))

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({ from: mockFrom })),
  createClient: jest.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options)
}

function makeActivityPayload(overrides: Partial<StravaWebhookPayload> = {}): StravaWebhookPayload {
  return {
    object_type: 'activity',
    aspect_type: 'create',
    object_id: 9876543,
    owner_id: 111222,
    subscription_id: 1,
    event_time: Math.floor(Date.now() / 1000),
    updates: {},
    ...overrides,
  }
}

// ── GET — Strava challenge verification ───────────────────────────────────────

describe('GET /api/strava/webhook', () => {
  const VERIFY_TOKEN = 'my-verify-token'

  beforeEach(() => {
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN
  })

  afterEach(() => {
    delete process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  })

  it('responds with hub.challenge when mode and token are correct', async () => {
    const url =
      'https://app.com/api/strava/webhook' +
      '?hub.mode=subscribe' +
      `&hub.verify_token=${VERIFY_TOKEN}` +
      '&hub.challenge=abc123'

    const res = await GET(makeRequest(url))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body['hub.challenge']).toBe('abc123')
  })

  it('returns 403 when verify token is wrong', async () => {
    const url =
      'https://app.com/api/strava/webhook' +
      '?hub.mode=subscribe' +
      '&hub.verify_token=wrong-token' +
      '&hub.challenge=abc123'

    const res = await GET(makeRequest(url))
    expect(res.status).toBe(403)
  })

  it('returns 403 when mode is not subscribe', async () => {
    const url =
      'https://app.com/api/strava/webhook' +
      '?hub.mode=unsubscribe' +
      `&hub.verify_token=${VERIFY_TOKEN}` +
      '&hub.challenge=abc123'

    const res = await GET(makeRequest(url))
    expect(res.status).toBe(403)
  })

  it('returns 403 when parameters are missing', async () => {
    const res = await GET(makeRequest('https://app.com/api/strava/webhook'))
    expect(res.status).toBe(403)
  })
})

// ── POST — Webhook event receiver ─────────────────────────────────────────────

describe('POST /api/strava/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('always returns 200 with { ok: true }', async () => {
    const req = makeRequest('https://app.com/api/strava/webhook', {
      method: 'POST',
      body: JSON.stringify(makeActivityPayload()),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('logs the raw payload to strava_webhook_events with processed: false', async () => {
    const payload = makeActivityPayload()
    const req = makeRequest('https://app.com/api/strava/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)

    expect(mockFrom).toHaveBeenCalledWith('strava_webhook_events')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ payload, processed: false })
    )
  })

  it('stores a process_after timestamp approximately 30 seconds in the future', async () => {
    const before = Date.now()
    const req = makeRequest('https://app.com/api/strava/webhook', {
      method: 'POST',
      body: JSON.stringify(makeActivityPayload()),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)

    const inserted = mockInsert.mock.calls[0][0]
    const processAfterMs = new Date(inserted.process_after).getTime()
    const after = Date.now()

    expect(processAfterMs).toBeGreaterThanOrEqual(before + 29_000)
    expect(processAfterMs).toBeLessThanOrEqual(after + 31_000)
  })

  it('does not call processBatch inline — processing is fully deferred', async () => {
    const stravaFetchSpy = jest.spyOn(global, 'fetch')

    const req = makeRequest('https://app.com/api/strava/webhook', {
      method: 'POST',
      body: JSON.stringify(makeActivityPayload()),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)

    expect(stravaFetchSpy).not.toHaveBeenCalled()
    stravaFetchSpy.mockRestore()
  })

  it('handles non-activity events without error', async () => {
    const payload = makeActivityPayload({ object_type: 'athlete', aspect_type: 'update' })
    const req = makeRequest('https://app.com/api/strava/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

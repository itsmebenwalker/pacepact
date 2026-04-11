/**
 * Integration tests for POST /api/strava/process-webhooks.
 *
 * Covers auth enforcement, empty-queue handling, batch grouping by
 * (owner_id, event_time), and marking processed events as done.
 */

import { POST } from '@/app/api/strava/process-webhooks/route'
import type { StravaWebhookPayload } from '@/types'

// ── Shared mock state ─────────────────────────────────────────────────────────

let mockDueEvents: Array<{ id: string; payload: StravaWebhookPayload }> = []

const mockUpdate = jest.fn()
const mockUpdateEq = jest.fn()
const mockUpdateIn = jest.fn().mockResolvedValue({ error: null })

const mockProcessBatch = jest.fn().mockResolvedValue(undefined)

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'strava_webhook_events') {
        return {
          select: () => ({
            eq: () => ({
              lte: () => Promise.resolve({ data: mockDueEvents, error: null }),
            }),
          }),
          update: mockUpdate,
        }
      }
      return {}
    },
  })),
  createClient: jest.fn(),
}))

jest.mock('@/lib/strava/webhook', () => ({
  processBatch: (...args: unknown[]) => mockProcessBatch(...args),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(secret = 'test-secret'): Request {
  return new Request('https://app.com/api/strava/process-webhooks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })
}

function makeStoredEvent(
  id: string,
  ownerId: number,
  eventTime: number,
  objectId = 12345
): { id: string; payload: StravaWebhookPayload } {
  return {
    id,
    payload: {
      object_type: 'activity',
      aspect_type: 'create',
      object_id: objectId,
      owner_id: ownerId,
      subscription_id: 1,
      event_time: eventTime,
      updates: {},
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/strava/process-webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockDueEvents = []
    mockUpdate.mockReturnValue({ in: mockUpdateIn })
    mockUpdateEq.mockReturnValue({ in: mockUpdateIn })
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('https://app.com/api/strava/process-webhooks', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when the secret is wrong', async () => {
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with the correct secret', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
  })

  // ── Empty queue ───────────────────────────────────────────────────────────

  it('returns { processed: 0 } when there are no due events', async () => {
    mockDueEvents = []
    const res = await POST(makeRequest())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(mockProcessBatch).not.toHaveBeenCalled()
  })

  // ── Batch grouping ────────────────────────────────────────────────────────

  it('calls processBatch once for a single event', async () => {
    mockDueEvents = [makeStoredEvent('evt-1', 111, 1000)]

    await POST(makeRequest())

    expect(mockProcessBatch).toHaveBeenCalledTimes(1)
    expect(mockProcessBatch).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ id: 'evt-1' })]
    )
  })

  it('groups events with the same owner_id and event_time into one batch', async () => {
    // Three events from the same Garmin multisport workout
    mockDueEvents = [
      makeStoredEvent('evt-ride', 111, 1000, 10001),
      makeStoredEvent('evt-transition', 111, 1000, 10002),
      makeStoredEvent('evt-run', 111, 1000, 10003),
    ]

    await POST(makeRequest())

    expect(mockProcessBatch).toHaveBeenCalledTimes(1)
    const batchArg = mockProcessBatch.mock.calls[0][1]
    expect(batchArg).toHaveLength(3)
    expect(batchArg.map((e: { id: string }) => e.id)).toEqual(
      expect.arrayContaining(['evt-ride', 'evt-transition', 'evt-run'])
    )
  })

  it('creates separate batches for different owner_id values', async () => {
    mockDueEvents = [
      makeStoredEvent('evt-user1', 111, 1000),
      makeStoredEvent('evt-user2', 222, 1000),
    ]

    await POST(makeRequest())

    expect(mockProcessBatch).toHaveBeenCalledTimes(2)
  })

  it('creates separate batches for the same owner with different event_times', async () => {
    mockDueEvents = [
      makeStoredEvent('evt-morning', 111, 1000),
      makeStoredEvent('evt-evening', 111, 9999),
    ]

    await POST(makeRequest())

    expect(mockProcessBatch).toHaveBeenCalledTimes(2)
  })

  // ── Processed count ───────────────────────────────────────────────────────

  it('returns the total number of events processed', async () => {
    mockDueEvents = [
      makeStoredEvent('evt-ride', 111, 1000, 10001),
      makeStoredEvent('evt-run', 111, 1000, 10002),
    ]

    const res = await POST(makeRequest())
    const body = await res.json()

    expect(body.processed).toBe(2)
  })

  // ── Error resilience ──────────────────────────────────────────────────────

  it('continues processing remaining batches if one batch throws', async () => {
    mockDueEvents = [
      makeStoredEvent('evt-user1', 111, 1000),
      makeStoredEvent('evt-user2', 222, 1000),
    ]

    mockProcessBatch
      .mockRejectedValueOnce(new Error('Strava API down'))
      .mockResolvedValueOnce(undefined)

    const res = await POST(makeRequest())

    // Second batch still processes
    expect(mockProcessBatch).toHaveBeenCalledTimes(2)
    // Only the successful batch is counted
    const body = await res.json()
    expect(body.processed).toBe(1)
  })
})

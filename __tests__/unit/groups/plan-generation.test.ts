/**
 * Tests for lib/groups/plan-generation.ts — the retry-aware plan generation
 * module.
 *
 * Covers:
 *  - claimGenerationAttempt CAS: only runs when status='generating', attempts < MAX,
 *    and last_attempt_at is null OR older than the stuck threshold.
 *  - runPlanGeneration success: marks ready, fans out, inserts notification.
 *  - runPlanGeneration transient failure (attempt < MAX): leaves row alone so
 *    the next stuck-detection caller can retry.
 *  - runPlanGeneration final failure (attempt = MAX): marks failed AND sends
 *    the support-contact email to the creator.
 */

import type { Group, TrainingSession } from '@/types'

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockGenerateTrainingPlan = jest.fn()
const mockFanOutSessionsForUser = jest.fn()
const mockResendSend = jest.fn()
const mockGetUserById = jest.fn()

jest.mock('@/lib/claude/generate-plan', () => ({
  generateTrainingPlan: mockGenerateTrainingPlan,
}))

jest.mock('@/lib/groups/fan-out', () => ({
  fanOutSessionsForUser: mockFanOutSessionsForUser,
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}))

// Import AFTER mocks
import {
  claimGenerationAttempt,
  runPlanGeneration,
  MAX_PLAN_GENERATION_ATTEMPTS,
  STUCK_THRESHOLD_MS,
} from '@/lib/groups/plan-generation'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_GROUP: Group = {
  id: 'group-1',
  name: 'Marathon Crew',
  event_name: 'Berlin Marathon',
  event_type: 'marathon',
  event_date: '2026-10-01',
  ambition: 'finish',
  training_plan: [],
  invite_code: 'abc123',
  invite_locked: false,
  allow_manual_complete: true,
  members_cap: null,
  plan_status: 'generating',
  plan_generation_attempts: 0,
  plan_generation_last_attempt_at: null,
  other_sport: null,
  other_distance_km: null,
  created_by: 'user-creator',
  created_at: '2026-05-07T00:00:00Z',
}

const MOCK_SESSIONS: TrainingSession[] = [
  {
    week_number: 1,
    session_type: 'run',
    target_distance_km: 5,
    target_duration_minutes: null,
    target_description: 'Easy 5km run',
    day_of_week: 1,
    tip: 'Conversational pace.',
  },
]

// ── claim helper ──────────────────────────────────────────────────────────────

interface ClaimMocks {
  // last call captured for assertions
  lastUpdateValues?: Record<string, unknown>
  selectFilters: Record<string, unknown>[]
}

function makeClaimClient(opts: {
  currentGroup: Group | null
  claimResult: Group | null   // what the CAS update returns
}): { client: any; mocks: ClaimMocks } {
  const mocks: ClaimMocks = { selectFilters: [] }

  // SELECT chain: from('groups').select('*').eq('id', id).single()
  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: opts.currentGroup, error: null }),
  }

  // UPDATE chain:
  //   from('groups').update(values).eq().eq().eq().{is|lt}().select().single()
  // The terminal call is .single() (returns the awaited result).
  const claimSinglePromise = Promise.resolve({ data: opts.claimResult, error: null })

  const claimChain: any = {
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue(claimSinglePromise),
  }

  const updateFn = jest.fn((values: Record<string, unknown>) => {
    mocks.lastUpdateValues = values
    return claimChain
  })

  const fromFn = jest.fn(() => ({
    select: jest.fn(() => selectChain),
    update: updateFn,
  }))

  return { client: { from: fromFn }, mocks }
}

// ── claim tests ───────────────────────────────────────────────────────────────

describe('claimGenerationAttempt', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null if the group does not exist', async () => {
    const { client } = makeClaimClient({ currentGroup: null, claimResult: null })
    const result = await claimGenerationAttempt(client, 'missing')
    expect(result).toBeNull()
  })

  it('returns null if plan_status is not generating', async () => {
    const { client } = makeClaimClient({
      currentGroup: { ...BASE_GROUP, plan_status: 'ready' },
      claimResult: null,
    })
    const result = await claimGenerationAttempt(client, BASE_GROUP.id)
    expect(result).toBeNull()
  })

  it('returns null when attempts already at the max', async () => {
    const { client } = makeClaimClient({
      currentGroup: { ...BASE_GROUP, plan_generation_attempts: MAX_PLAN_GENERATION_ATTEMPTS },
      claimResult: null,
    })
    const result = await claimGenerationAttempt(client, BASE_GROUP.id)
    expect(result).toBeNull()
  })

  it('claims attempt 1 when last_attempt_at is null and writes incremented count', async () => {
    const claimedRow = { ...BASE_GROUP, plan_generation_attempts: 1 }
    const { client, mocks } = makeClaimClient({
      currentGroup: BASE_GROUP,
      claimResult: claimedRow,
    })
    const result = await claimGenerationAttempt(client, BASE_GROUP.id)
    expect(result).toEqual(claimedRow)
    expect(mocks.lastUpdateValues?.plan_generation_attempts).toBe(1)
    expect(mocks.lastUpdateValues?.plan_generation_last_attempt_at).toEqual(expect.any(String))
  })

  it('claims a stuck attempt when last_attempt_at is older than the threshold', async () => {
    const stale = new Date(Date.now() - STUCK_THRESHOLD_MS - 5_000).toISOString()
    const claimedRow = { ...BASE_GROUP, plan_generation_attempts: 2 }
    const { client } = makeClaimClient({
      currentGroup: { ...BASE_GROUP, plan_generation_attempts: 1, plan_generation_last_attempt_at: stale },
      claimResult: claimedRow,
    })
    const result = await claimGenerationAttempt(client, BASE_GROUP.id)
    expect(result).toEqual(claimedRow)
  })

  it('returns null if the CAS finds no matching row (race lost)', async () => {
    const { client } = makeClaimClient({
      currentGroup: BASE_GROUP,
      claimResult: null,
    })
    const result = await claimGenerationAttempt(client, BASE_GROUP.id)
    expect(result).toBeNull()
  })
})

// ── runPlanGeneration helper ──────────────────────────────────────────────────

function makeRunClient() {
  const updateEq = jest.fn().mockResolvedValue({ data: null, error: null })
  const update = jest.fn(() => ({ eq: updateEq }))
  const notifInsert = jest.fn().mockResolvedValue({ data: null, error: null })

  const fromFn = jest.fn((table: string) => {
    if (table === 'groups') return { update }
    if (table === 'notifications') return { insert: notifInsert }
    return {}
  })

  const auth = {
    admin: { getUserById: mockGetUserById },
  }

  return {
    client: { from: fromFn, auth } as any,
    update,
    updateEq,
    notifInsert,
  }
}

// ── runPlanGeneration tests ───────────────────────────────────────────────────

describe('runPlanGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-key'
    mockGenerateTrainingPlan.mockResolvedValue({ sessions: MOCK_SESSIONS, raw: JSON.stringify(MOCK_SESSIONS) })
    mockFanOutSessionsForUser.mockResolvedValue(undefined)
    mockResendSend.mockResolvedValue(undefined)
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'creator@example.com' } }, error: null })
  })

  it('on success: marks group ready with the generated sessions', async () => {
    const m = makeRunClient()
    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: 1 })

    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan_status: 'ready', training_plan: MOCK_SESSIONS })
    )
  })

  it('on success: fans out sessions to the creator', async () => {
    const m = makeRunClient()
    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: 1 })

    expect(mockFanOutSessionsForUser).toHaveBeenCalledWith(
      m.client,
      expect.objectContaining({ id: BASE_GROUP.id, training_plan: MOCK_SESSIONS }),
      BASE_GROUP.created_by
    )
  })

  it('on success: inserts a plan_ready notification', async () => {
    const m = makeRunClient()
    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: 1 })

    expect(m.notifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: BASE_GROUP.created_by,
        type: 'plan_ready',
        group_id: BASE_GROUP.id,
      })
    )
  })

  it('passes other_sport and other_distance_km from the group row when present', async () => {
    const m = makeRunClient()
    await runPlanGeneration(m.client, {
      ...BASE_GROUP,
      event_type: 'other',
      other_sport: 'cycling',
      other_distance_km: 120,
      plan_generation_attempts: 1,
    })

    expect(mockGenerateTrainingPlan).toHaveBeenCalledWith(
      'other', BASE_GROUP.event_date, BASE_GROUP.ambition, 'cycling', 120
    )
  })

  // ── Failure paths ─────────────────────────────────────────────────────────

  it('on transient failure (attempt < MAX): does NOT mark failed, does NOT email', async () => {
    mockGenerateTrainingPlan.mockRejectedValue(new Error('Anthropic timeout'))
    const m = makeRunClient()

    // Attempt 1 of 3 — should leave the row alone for the next caller to retry.
    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: 1 })

    expect(m.update).not.toHaveBeenCalled()
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('on final failure (attempt = MAX): marks group failed and emails the creator', async () => {
    mockGenerateTrainingPlan.mockRejectedValue(new Error('Anthropic timeout'))
    const m = makeRunClient()

    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: MAX_PLAN_GENERATION_ATTEMPTS })

    expect(m.update).toHaveBeenCalledWith({ plan_status: 'failed' })
    expect(mockGetUserById).toHaveBeenCalledWith(BASE_GROUP.created_by)
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        subject: expect.stringContaining(BASE_GROUP.name),
      })
    )
  })

  it('on final failure: skips the email if RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY
    mockGenerateTrainingPlan.mockRejectedValue(new Error('boom'))
    const m = makeRunClient()

    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: MAX_PLAN_GENERATION_ATTEMPTS })

    expect(m.update).toHaveBeenCalledWith({ plan_status: 'failed' })
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('on final failure: still marks failed even if the email lookup errors', async () => {
    mockGenerateTrainingPlan.mockRejectedValue(new Error('boom'))
    mockGetUserById.mockResolvedValue({ data: null, error: new Error('user gone') })
    const m = makeRunClient()

    await runPlanGeneration(m.client, { ...BASE_GROUP, plan_generation_attempts: MAX_PLAN_GENERATION_ATTEMPTS })

    expect(m.update).toHaveBeenCalledWith({ plan_status: 'failed' })
    expect(mockResendSend).not.toHaveBeenCalled()
  })
})

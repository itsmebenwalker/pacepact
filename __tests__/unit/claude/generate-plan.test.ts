/**
 * Tests for the plan generation parser logic.
 * The Anthropic client is mocked — we test that generateTrainingPlan correctly
 * handles clean JSON, markdown-fenced JSON, and malformed responses.
 */

import type { TrainingSession } from '@/types'

// ── Mock setup ───────────────────────────────────────────────────────────────
// Must be declared before jest.mock (factory runs at hoist time, so the mock
// fn itself is captured via the shared reference in the module factory closure).

const mockCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Import AFTER mocking so the module-level `new Anthropic()` picks up the mock
import { generateTrainingPlan } from '@/lib/claude/generate-plan'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SESSIONS: TrainingSession[] = [
  {
    week_number: 1,
    session_type: 'run',
    target_distance_km: 5,
    target_duration_minutes: null,
    target_description: 'Easy 5km run',
    day_of_week: 1,
    tip: 'Keep a conversational pace throughout.',
  },
  {
    week_number: 1,
    session_type: 'rest',
    target_distance_km: null,
    target_duration_minutes: null,
    target_description: 'Rest day',
    day_of_week: 7,
    tip: 'Rest is training. Prioritize sleep today.',
  },
]

function makeApiResponse(text: string, stop_reason = 'end_turn') {
  return {
    stop_reason,
    content: [{ type: 'text', text }],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateTrainingPlan — JSON parsing', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('parses a clean JSON response', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    const { sessions } = await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(sessions).toHaveLength(2)
    expect(sessions[0].session_type).toBe('run')
  })

  it('parses a response wrapped in markdown json fences', async () => {
    const wrapped = '```json\n' + JSON.stringify(VALID_SESSIONS) + '\n```'
    mockCreate.mockResolvedValue(makeApiResponse(wrapped))

    const { sessions } = await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(sessions).toHaveLength(2)
  })

  it('parses a response wrapped in plain markdown fences', async () => {
    const wrapped = '```\n' + JSON.stringify(VALID_SESSIONS) + '\n```'
    mockCreate.mockResolvedValue(makeApiResponse(wrapped))

    const { sessions } = await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(sessions).toHaveLength(2)
  })

  it('returns the raw response alongside parsed sessions', async () => {
    const raw = JSON.stringify(VALID_SESSIONS)
    mockCreate.mockResolvedValue(makeApiResponse(raw))

    const result = await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(result.raw).toBe(raw)
  })

  it('throws when response is not an array', async () => {
    mockCreate.mockResolvedValue(
      makeApiResponse(JSON.stringify({ sessions: VALID_SESSIONS }))
    )

    await expect(
      generateTrainingPlan('marathon', '2026-10-01', 'finish')
    ).rejects.toThrow('Claude returned non-array plan')
  })

  it('throws when response is invalid JSON', async () => {
    mockCreate.mockResolvedValue(
      makeApiResponse('Sorry, I cannot generate a plan right now.')
    )

    await expect(
      generateTrainingPlan('marathon', '2026-10-01', 'finish')
    ).rejects.toThrow()
  })

  it('passes the correct model to the API', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-20250514' })
    )
  })

  it('includes event type and ambition in the prompt', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    await generateTrainingPlan('triathlon', '2026-10-01', 'podium')

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = callArgs.messages[0].content as string
    expect(userMessage).toContain('triathlon')
    expect(userMessage).toContain('podium')
  })

  it('preserves the tip field from the parsed session', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    const { sessions } = await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(sessions[0].tip).toBe('Keep a conversational pace throughout.')
  })

  it('includes tip in the prompt schema', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = callArgs.messages[0].content as string
    expect(userMessage).toContain('"tip"')
  })

  it('passes max_tokens 64000 to the API', async () => {
    mockCreate.mockResolvedValue(makeApiResponse(JSON.stringify(VALID_SESSIONS)))

    await generateTrainingPlan('marathon', '2026-10-01', 'finish')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 64000 })
    )
  })

  it('throws with a descriptive message when stop_reason is max_tokens', async () => {
    mockCreate.mockResolvedValue(makeApiResponse('', 'max_tokens'))

    await expect(
      generateTrainingPlan('marathon', '2026-10-01', 'finish')
    ).rejects.toThrow('Plan generation exceeded token limit')
  })
})

import {
  calculateGroupPrice,
  calculateCapUpgradePrice,
  weeksUntilEvent,
} from '@/lib/payments/calculate-price'

// Pin "today" to a known date so week calculations are deterministic
const TODAY = '2026-06-01'

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(TODAY))
})

afterEach(() => {
  jest.useRealTimers()
})

// ── weeksUntilEvent ───────────────────────────────────────────────────────────

describe('weeksUntilEvent', () => {
  it('returns 1 for an event today (minimum)', () => {
    expect(weeksUntilEvent(TODAY)).toBe(1)
  })

  it('returns 1 for an event in the past (clamped to minimum)', () => {
    expect(weeksUntilEvent('2026-01-01')).toBe(1)
  })

  it('returns 1 for an event exactly 7 days away', () => {
    expect(weeksUntilEvent('2026-06-08')).toBe(1)
  })

  it('returns 2 for an event 8 days away (ceil)', () => {
    expect(weeksUntilEvent('2026-06-09')).toBe(2)
  })

  it('returns 4 for an event 28 days away', () => {
    expect(weeksUntilEvent('2026-06-29')).toBe(4)
  })

  it('returns 26 for an event 26 weeks away', () => {
    expect(weeksUntilEvent('2026-11-30')).toBe(26)
  })
})

// ── calculateGroupPrice ───────────────────────────────────────────────────────

describe('calculateGroupPrice', () => {
  it('calculates correctly for a typical group', () => {
    // 20 members × 4 weeks × $0.05 = $4.00 = 400 cents
    const price = calculateGroupPrice(20, '2026-06-29')
    expect(price.seats).toBe(20)
    expect(price.weeks).toBe(4)
    expect(price.ratePerSeatPerWeek).toBe(0.05)
    expect(price.amountCents).toBe(400)
    expect(price.subtotalAud).toBeCloseTo(4.0)
  })

  it('enforces the $0.50 AUD minimum charge', () => {
    // 2 members × 1 week × $0.05 = $0.10 → clamped to $0.50 = 50 cents
    const price = calculateGroupPrice(2, TODAY)
    expect(price.amountCents).toBe(50)
  })

  it('applies the minimum for any combination below $0.50', () => {
    // 9 members × 1 week × $0.05 = $0.45 → clamped
    const price = calculateGroupPrice(9, '2026-06-08')
    expect(price.amountCents).toBe(50)
  })

  it('does not apply the minimum when subtotal is already above $0.50', () => {
    // 10 members × 1 week × $0.05 = $0.50 exactly
    const price = calculateGroupPrice(10, '2026-06-08')
    expect(price.amountCents).toBe(50)
  })

  it('handles 100 members × 20 weeks', () => {
    // 100 × 20 × $0.05 = $100.00 = 10000 cents
    const price = calculateGroupPrice(100, '2026-10-19')
    expect(price.amountCents).toBe(10000)
  })

  it('rounds half-cents correctly', () => {
    // 3 members × 1 week × $0.05 = $0.15 → clamped to $0.50
    const price = calculateGroupPrice(3, '2026-06-08')
    expect(price.amountCents).toBe(50)
  })

  it('returns a displayAmount string in AUD format', () => {
    const price = calculateGroupPrice(20, '2026-06-29')
    expect(price.displayAmount).toMatch(/\$4\.00/)
  })
})

// ── calculateCapUpgradePrice ──────────────────────────────────────────────────

describe('calculateCapUpgradePrice', () => {
  it('prices on seats added (delta), not the full new cap', () => {
    // +5 seats × 4 weeks × $0.05 = $1.00 = 100 cents
    const price = calculateCapUpgradePrice(5, '2026-06-29')
    expect(price.seats).toBe(5)
    expect(price.amountCents).toBe(100)
  })

  it('enforces the $0.50 minimum', () => {
    // +1 seat × 1 week × $0.05 = $0.05 → clamped to $0.50
    const price = calculateCapUpgradePrice(1, '2026-06-08')
    expect(price.amountCents).toBe(50)
  })

  it('calculates correctly for a large delta', () => {
    // +50 seats × 10 weeks × $0.05 = $25.00 = 2500 cents
    const price = calculateCapUpgradePrice(50, '2026-08-10')
    expect(price.amountCents).toBe(2500)
  })
})

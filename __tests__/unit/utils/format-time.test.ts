import { formatMessageTime } from '@/lib/utils/format-time'

// Fixed "now" in local midnight-relative terms so tests are timezone-agnostic
const NOW = new Date()
NOW.setHours(14, 30, 0, 0) // 14:30 today (local)

/**
 * Builds a timestamp at `daysOffset` calendar days from NOW,
 * at the given local hour. Positive = future, negative = past.
 */
function localTimestamp(daysOffset: number, localHour = 10): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysOffset)
  d.setHours(localHour, 0, 0, 0)
  return d.toISOString()
}

describe('formatMessageTime — same day', () => {
  it('returns HH:MM format for a timestamp earlier today', () => {
    const result = formatMessageTime(localTimestamp(0, 9), NOW)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('reflects the correct local hour', () => {
    const result = formatMessageTime(localTimestamp(0, 9), NOW)
    expect(result).toBe('09:00')
  })

  it('zero-pads single-digit hours and minutes', () => {
    const d = new Date(NOW)
    d.setHours(7, 3, 0, 0)
    const result = formatMessageTime(d.toISOString(), NOW)
    expect(result).toBe('07:03')
  })
})

describe('formatMessageTime — yesterday', () => {
  it('returns "Yesterday" for a timestamp on the previous calendar day', () => {
    const result = formatMessageTime(localTimestamp(-1, 12), NOW)
    expect(result).toBe('Yesterday')
  })

  it('returns "Yesterday" for early morning yesterday', () => {
    const result = formatMessageTime(localTimestamp(-1, 1), NOW)
    expect(result).toBe('Yesterday')
  })
})

describe('formatMessageTime — within the week', () => {
  it('returns a short weekday name for 2 days ago', () => {
    const result = formatMessageTime(localTimestamp(-2, 10), NOW)
    expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
  })

  it('returns a short weekday name for 6 days ago', () => {
    const result = formatMessageTime(localTimestamp(-6, 10), NOW)
    expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
  })

  it('does not return "Yesterday" for 2 days ago', () => {
    const result = formatMessageTime(localTimestamp(-2, 10), NOW)
    expect(result).not.toBe('Yesterday')
  })
})

describe('formatMessageTime — older', () => {
  it('returns "Month Day" for exactly 7 days ago', () => {
    const result = formatMessageTime(localTimestamp(-7, 10), NOW)
    expect(result).toMatch(/^[A-Z][a-z]{2}\s+\d{1,2}$/)
  })

  it('returns "Month Day" for a date far in the past', () => {
    const result = formatMessageTime(localTimestamp(-90, 10), NOW)
    expect(result).toMatch(/^[A-Z][a-z]{2}\s+\d{1,2}$/)
  })
})

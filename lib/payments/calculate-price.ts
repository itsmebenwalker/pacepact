// Minimum charge in AUD cents (Stripe requires at least $0.50)
const MIN_AMOUNT_CENTS = 50

export interface PriceBreakdown {
  seats: number
  weeks: number
  ratePerSeatPerWeek: number
  subtotalAud: number
  amountCents: number
  displayAmount: string
}

/**
 * Price for creating a new group.
 * Formula: members_cap × weeks_until_event × $0.05 AUD
 */
export function calculateGroupPrice(membersCap: number, eventDate: string): PriceBreakdown {
  return breakdown(membersCap, eventDate)
}

/**
 * Price for increasing a group's member cap.
 * Formula: seats_added × weeks_until_event × $0.05 AUD
 */
export function calculateCapUpgradePrice(deltaSeats: number, eventDate: string): PriceBreakdown {
  return breakdown(deltaSeats, eventDate)
}

function breakdown(seats: number, eventDate: string): PriceBreakdown {
  const weeks = weeksUntilEvent(eventDate)
  const subtotalAud = seats * weeks * 0.05
  const amountCents = Math.max(MIN_AMOUNT_CENTS, Math.round(subtotalAud * 100))
  return {
    seats,
    weeks,
    ratePerSeatPerWeek: 0.05,
    subtotalAud,
    amountCents,
    displayAmount: formatAud(amountCents),
  }
}

export function weeksUntilEvent(eventDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate)
  event.setHours(0, 0, 0, 0)
  const diffMs = event.getTime() - today.getTime()
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

function formatAud(amountCents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

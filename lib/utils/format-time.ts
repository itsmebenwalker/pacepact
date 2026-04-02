/**
 * Formats a UTC ISO timestamp into a human-readable relative label.
 *
 *  - Same calendar day  → "14:32"
 *  - Yesterday          → "Yesterday"
 *  - 2–6 days ago       → "Mon", "Tue", …
 *  - 7+ days ago        → "Apr 1"
 */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)

  if (date >= todayStart) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  if (date >= yesterdayStart) {
    return 'Yesterday'
  }

  if (date >= weekStart) {
    return date.toLocaleDateString('en', { weekday: 'short' })
  }

  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

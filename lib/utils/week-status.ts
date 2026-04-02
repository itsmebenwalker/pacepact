import type { Session } from '@/types'

export type WeekStatus = 'past-complete' | 'past-incomplete' | 'active'

/**
 * Determines the display status of a training week.
 *
 * - 'past-complete'   — week has ended and all active sessions are done
 * - 'past-incomplete' — week has ended with at least one session missed
 * - 'active'          — current or future week (or no dated sessions)
 */
export function getWeekStatus(sessions: Session[], today: string): WeekStatus {
  const dates = sessions
    .map((s) => s.scheduled_date)
    .filter((d): d is string => d !== null)
    .sort()

  if (dates.length === 0) return 'active'

  const maxDate = dates[dates.length - 1]
  if (maxDate >= today) return 'active'

  const activeSessions = sessions.filter((s) => s.session_type !== 'rest')
  const allComplete = activeSessions.length > 0 && activeSessions.every((s) => s.completed)

  return allComplete ? 'past-complete' : 'past-incomplete'
}

/**
 * Sorts weeks so that active (current + future) weeks come first in
 * ascending order, followed by past weeks in ascending order.
 */
export function sortWeeks(
  weeks: [number, Session[]][],
  today: string
): [number, Session[]][] {
  const active: [number, Session[]][] = []
  const past: [number, Session[]][] = []

  for (const entry of weeks) {
    if (getWeekStatus(entry[1], today) === 'active') {
      active.push(entry)
    } else {
      past.push(entry)
    }
  }

  active.sort(([a], [b]) => a - b)
  past.sort(([a], [b]) => a - b)

  return [...active, ...past]
}

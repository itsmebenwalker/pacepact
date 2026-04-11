import type { Session, StravaActivity } from '@/types'
import { mapStravaType } from '@/lib/points/calculator'

const MIN_COMPLETION_RATIO = 0.85

/**
 * Returns the Monday–Sunday bounds (YYYY-MM-DD) of the calendar week
 * containing the given date string.
 */
export function getWeekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay() // 0 = Sun, 1 = Mon, …
  const daysFromMonday = day === 0 ? 6 : day - 1

  const monday = new Date(d)
  monday.setDate(d.getDate() - daysFromMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

/**
 * Returns the earliest pending brick session scheduled in the same calendar week
 * as the given activity date. Used when a run/ride arrives that may be one leg
 * of a split Garmin multisport (brick) workout.
 *
 * When combinedDistanceKm / combinedDurationMin are supplied (second leg arrival),
 * the session target is validated against the same 85% threshold used for regular
 * sessions. Omit both when checking for a pending brick on first leg arrival.
 */
export function findPendingBrickSession(
  pendingSessions: Session[],
  activityDate: string,
  combinedDistanceKm?: number,
  combinedDurationMin?: number
): Session | null {
  const { start: weekStart, end: weekEnd } = getWeekBounds(activityDate)

  const brickSessions = pendingSessions.filter((s) => {
    if (s.completed) return false
    if (s.session_type !== 'brick') return false
    if (!s.scheduled_date) return false
    if (s.scheduled_date < weekStart || s.scheduled_date > weekEnd) return false

    // When combined stats are provided, validate against the session target
    if (combinedDistanceKm !== undefined && s.target_distance_km !== null) {
      if (combinedDistanceKm < s.target_distance_km * MIN_COMPLETION_RATIO) return false
    }
    if (
      combinedDurationMin !== undefined &&
      s.target_duration_minutes !== null &&
      s.target_distance_km === null
    ) {
      if (combinedDurationMin < s.target_duration_minutes * MIN_COMPLETION_RATIO) return false
    }

    return true
  })

  if (brickSessions.length === 0) return null

  brickSessions.sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!))
  return brickSessions[0]
}

export function matchActivity(
  activity: StravaActivity,
  pendingSessions: Session[]
): Session | null {
  const activityDate = activity.start_date_local.split('T')[0]
  const { start: weekStart, end: weekEnd } = getWeekBounds(activityDate)

  const activityType = mapStravaType(activity.type ?? activity.sport_type)
  const activityDistanceKm = activity.distance / 1000
  const activityDurationMin = activity.elapsed_time / 60

  const candidates = pendingSessions.filter((session) => {
    if (session.completed) return false
    if (session.session_type === 'rest') return false

    // Must be scheduled within the same calendar week as the activity
    if (!session.scheduled_date) return false
    if (session.scheduled_date < weekStart || session.scheduled_date > weekEnd) return false

    // Type match
    if (session.session_type !== activityType) return false

    // Distance threshold (if set)
    if (session.target_distance_km !== null) {
      if (activityDistanceKm < session.target_distance_km * MIN_COMPLETION_RATIO) {
        return false
      }
    }

    // Duration threshold (only when no distance target)
    if (session.target_duration_minutes !== null && session.target_distance_km === null) {
      if (activityDurationMin < session.target_duration_minutes * MIN_COMPLETION_RATIO) {
        return false
      }
    }

    return true
  })

  if (candidates.length === 0) return null

  // When multiple sessions in the week match, claim the earliest scheduled one
  candidates.sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!))

  return candidates[0]
}

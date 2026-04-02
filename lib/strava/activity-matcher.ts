import type { Session, StravaActivity } from '@/types'
import { mapStravaType } from '@/lib/points/calculator'

const MIN_COMPLETION_RATIO = 0.85

export function matchActivity(
  activity: StravaActivity,
  pendingSessions: Session[]
): Session | null {
  const activityType = mapStravaType(activity.type ?? activity.sport_type)
  const activityDistanceKm = activity.distance / 1000
  const activityDurationMin = activity.elapsed_time / 60

  const candidates = pendingSessions.filter((session) => {
    if (session.completed) return false
    if (session.session_type === 'rest') return false

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

  // When multiple sessions match, claim the earliest scheduled one first
  candidates.sort((a, b) => {
    if (!a.scheduled_date) return 1
    if (!b.scheduled_date) return -1
    return a.scheduled_date.localeCompare(b.scheduled_date)
  })

  return candidates[0]
}

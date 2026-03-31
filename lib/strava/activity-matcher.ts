import type { Session, StravaActivity } from '@/types'
import { mapStravaType } from '@/lib/points/calculator'

const MATCH_WINDOW_DAYS = 2
const MIN_COMPLETION_RATIO = 0.85

function dateDiffDays(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / msPerDay
}

export function matchActivity(
  activity: StravaActivity,
  pendingSessions: Session[]
): Session | null {
  const activityDate = activity.start_date_local.split('T')[0]
  const activityType = mapStravaType(activity.type ?? activity.sport_type)
  const activityDistanceKm = activity.distance / 1000
  const activityDurationMin = activity.elapsed_time / 60

  const candidates = pendingSessions.filter((session) => {
    if (session.completed) return false
    if (session.session_type === 'rest') return false

    // Type match
    if (session.session_type !== activityType) return false

    // Date window
    if (session.scheduled_date) {
      if (dateDiffDays(session.scheduled_date, activityDate) > MATCH_WINDOW_DAYS) {
        return false
      }
    }

    // Distance threshold
    if (session.target_distance_km !== null) {
      if (activityDistanceKm < session.target_distance_km * MIN_COMPLETION_RATIO) {
        return false
      }
    }

    // Duration threshold
    if (session.target_duration_minutes !== null && session.target_distance_km === null) {
      if (activityDurationMin < session.target_duration_minutes * MIN_COMPLETION_RATIO) {
        return false
      }
    }

    return true
  })

  if (candidates.length === 0) return null

  // Pick the closest by date
  candidates.sort((a, b) => {
    const da = a.scheduled_date ? dateDiffDays(a.scheduled_date, activityDate) : 999
    const db = b.scheduled_date ? dateDiffDays(b.scheduled_date, activityDate) : 999
    return da - db
  })

  return candidates[0]
}

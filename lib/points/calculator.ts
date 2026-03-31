import type { PointsResult, Session, StravaActivity } from '@/types'

const STRAVA_TYPE_MAP: Record<string, string> = {
  Run: 'run',
  VirtualRun: 'run',
  Ride: 'ride',
  VirtualRide: 'ride',
  Swim: 'swim',
  Workout: 'run',
}

export function mapStravaType(stravaType: string): string {
  return STRAVA_TYPE_MAP[stravaType] ?? stravaType.toLowerCase()
}

export function calculatePoints(
  session: Session,
  activity: StravaActivity,
  streakActive: boolean
): PointsResult {
  const base = 10
  let early_bonus = 0
  let exceed_bonus = 0
  const streak_bonus = streakActive ? 5 : 0

  // Early in week bonus: if scheduled_date is within the first 2 days of the week
  if (session.scheduled_date) {
    const scheduled = new Date(session.scheduled_date)
    const dayOfWeek = scheduled.getDay() // 0=Sun, 1=Mon, ...
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek // make Sun = 7
    if (adjustedDay <= 2) {
      early_bonus = 2
    }
  }

  // Exceed target bonus
  const activityDistanceKm = activity.distance / 1000
  const activityDurationMin = activity.elapsed_time / 60

  if (session.target_distance_km && activityDistanceKm > session.target_distance_km * 1.1) {
    exceed_bonus = 3
  } else if (session.target_duration_minutes && activityDurationMin > session.target_duration_minutes * 1.1) {
    exceed_bonus = 3
  }

  return {
    total: base + early_bonus + exceed_bonus + streak_bonus,
    base,
    early_bonus,
    exceed_bonus,
    streak_bonus,
  }
}

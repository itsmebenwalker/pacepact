import type { Session } from '@/types'

export interface MemberStat {
  user_id: string
  display_name: string | null
  completed: number
  total: number
  points: number
}

export interface WeekInReviewData {
  weekNumber: number
  dateRange: { start: string; end: string } | null
  teaser: string
  myStats: {
    completed: number
    total: number
    points: number
    distance: number
    duration: number
    hasStreak: boolean
  }
  priorStats: {
    completed: number
    points: number
  }
  memberStats: MemberStat[]
  upcomingSessions: Session[]
}

export function activeSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.session_type !== 'rest')
}

export function completedActive(sessions: Session[]): Session[] {
  return activeSessions(sessions).filter((s) => s.completed)
}

export function weekPoints(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + (s.points_awarded ?? 0), 0)
}

export function weekDistance(sessions: Session[]): number {
  return sessions
    .filter((s) => s.completed && s.target_distance_km)
    .reduce((sum, s) => sum + (s.target_distance_km ?? 0), 0)
}

export function weekDuration(sessions: Session[]): number {
  return sessions
    .filter((s) => s.completed && s.target_duration_minutes)
    .reduce((sum, s) => sum + (s.target_duration_minutes ?? 0), 0)
}

export function getDateRange(sessions: Session[]): { start: string; end: string } | null {
  const dates = sessions
    .map((s) => s.scheduled_date)
    .filter((d): d is string => d !== null)
    .sort()
  if (!dates.length) return null
  return { start: dates[0], end: dates[dates.length - 1] }
}

/**
 * Finds the most recently completed week that has at least one non-rest session.
 * A week is "completed" when its latest scheduled_date is strictly before today.
 */
export function findReviewWeek(
  weekMap: Map<number, Session[]>,
  today: string
): [number, Session[]] | null {
  const pastWeeks = Array.from(weekMap.entries()).filter(([, sessions]) => {
    const dates = sessions
      .map((s) => s.scheduled_date)
      .filter((d): d is string => d !== null)
      .sort()
    return (
      dates.length > 0 &&
      dates[dates.length - 1] < today &&
      sessions.some((s) => s.session_type !== 'rest')
    )
  })

  if (!pastWeeks.length) return null

  pastWeeks.sort(([a], [b]) => b - a)
  return pastWeeks[0]
}

export function buildTeaser(
  myCompleted: number,
  myTotal: number,
  priorCompleted: number,
  hasPriorWeek: boolean
): string {
  if (!hasPriorWeek || priorCompleted === 0) {
    return `${myCompleted}/${myTotal} sessions done`
  }
  const diff = myCompleted - priorCompleted
  if (diff > 0) return `${myCompleted}/${myTotal} sessions — up ${diff} from last week`
  if (diff < 0) return `${myCompleted}/${myTotal} sessions — down ${Math.abs(diff)} from last week`
  return `${myCompleted}/${myTotal} sessions — same as last week`
}

export function buildWeekInReviewData(
  allSessions: Session[],
  currentUserId: string,
  members: { user_id: string; display_name: string | null; points: number }[],
  today: string
): WeekInReviewData | null {
  const weekMap = new Map<number, Session[]>()
  for (const s of allSessions) {
    if (!weekMap.has(s.week_number)) weekMap.set(s.week_number, [])
    weekMap.get(s.week_number)!.push(s)
  }

  const reviewEntry = findReviewWeek(weekMap, today)
  if (!reviewEntry) return null

  const [reviewWeekNum, reviewWeekSessions] = reviewEntry
  const priorWeekSessions = weekMap.get(reviewWeekNum - 1) ?? []

  const myReview = reviewWeekSessions.filter((s) => s.user_id === currentUserId)
  const myPrior = priorWeekSessions.filter((s) => s.user_id === currentUserId)

  const myCompleted = completedActive(myReview).length
  const myTotal = activeSessions(myReview).length
  const myPoints = weekPoints(myReview)
  const myDistance = weekDistance(myReview)
  const myDuration = weekDuration(myReview)

  const priorCompleted = completedActive(myPrior).length
  const priorPoints = weekPoints(myPrior)
  const hasPriorWeek = priorWeekSessions.length > 0
  const hasStreak = myCompleted > 0 && priorCompleted > 0

  const memberStats = members
    .map((m) => {
      const ms = reviewWeekSessions.filter((s) => s.user_id === m.user_id)
      return {
        user_id: m.user_id,
        display_name: m.display_name,
        completed: completedActive(ms).length,
        total: activeSessions(ms).length,
        points: weekPoints(ms),
      }
    })
    .sort((a, b) => b.completed - a.completed || b.points - a.points)

  // Upcoming sessions: earliest active week for the current user
  const activeWeeks = Array.from(weekMap.entries()).filter(([, sessions]) => {
    const dates = sessions
      .map((s) => s.scheduled_date)
      .filter((d): d is string => d !== null)
      .sort()
    return dates.length > 0 && dates[dates.length - 1] >= today
  })
  activeWeeks.sort(([a], [b]) => a - b)
  const [, currentWeekSessions = []] = activeWeeks[0] ?? [undefined, []]
  const upcomingSessions = (currentWeekSessions as Session[])
    .filter(
      (s) => s.user_id === currentUserId && !s.completed && s.session_type !== 'rest'
    )
    .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
    .slice(0, 3)

  return {
    weekNumber: reviewWeekNum,
    dateRange: getDateRange(myReview),
    teaser: buildTeaser(myCompleted, myTotal, priorCompleted, hasPriorWeek),
    myStats: {
      completed: myCompleted,
      total: myTotal,
      points: myPoints,
      distance: myDistance,
      duration: myDuration,
      hasStreak,
    },
    priorStats: { completed: priorCompleted, points: priorPoints },
    memberStats,
    upcomingSessions,
  }
}

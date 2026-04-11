import type { BrickActivityPart, Session } from '@/types'
import SessionCard from './SessionCard'
import { getWeekStatus } from '@/lib/utils/week-status'
import { getWeekBounds } from '@/lib/strava/activity-matcher'

interface Props {
  weekNumber: number
  sessions: Session[]
  today: string // YYYY-MM-DD — passed from the server-rendered page
  brickParts?: BrickActivityPart[]
}

/**
 * Returns a compact date range label for a week's sessions, e.g.:
 *   "1–7 Apr"   (same month)
 *   "28 Apr – 4 May"  (month boundary)
 * Returns null if no sessions have a scheduled_date.
 */
export function weekDateRange(sessions: Session[]): string | null {
  const dates = sessions
    .map((s) => s.scheduled_date)
    .filter((d): d is string => d !== null)
    .sort()

  if (dates.length === 0) return null

  const start = new Date(`${dates[0]}T12:00:00`)
  const end = new Date(`${dates[dates.length - 1]}T12:00:00`)

  const startMonth = start.toLocaleDateString('en', { month: 'short' })
  const endMonth = end.toLocaleDateString('en', { month: 'short' })

  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${endMonth}`
  }

  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
}

export default function WeekView({ weekNumber, sessions, today, brickParts = [] }: Props) {
  const status = getWeekStatus(sessions, today)
  const restCount = sessions.filter((s) => s.session_type === 'rest').length
  const activeSessions = sessions.filter((s) => s.session_type !== 'rest')
  const completed = activeSessions.filter((s) => s.completed).length
  const dateRange = weekDateRange(sessions)

  // Find the brick parts that fall within this week so we can show the progress
  // bar on the right session card. Match by the part's activity_date against the
  // week's calendar bounds derived from the sessions' scheduled dates.
  const firstDate = sessions.find((s) => s.scheduled_date)?.scheduled_date
  const weekBounds = firstDate ? getWeekBounds(firstDate) : null
  const weekBrickParts = weekBounds
    ? brickParts.filter(
        (p) => p.activity_date && p.activity_date >= weekBounds.start && p.activity_date <= weekBounds.end
      )
    : []

  const restNote = restCount === 1
    ? 'Recommended: 1 rest day this week'
    : `Recommended: ${restCount} rest days this week`

  const cardClass = [
    'rounded-lg overflow-hidden border',
    status === 'past-complete'
      ? 'bg-white dark:bg-zinc-900 border-green-200 dark:border-green-800'
      : status === 'past-incomplete'
      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-60'
      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
  ].join(' ')

  const headerClass = [
    'px-4 py-3 sm:px-5 border-b flex items-center justify-between',
    status === 'past-complete'
      ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'
      : status === 'past-incomplete'
      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
      : 'border-zinc-100 dark:border-zinc-800',
  ].join(' ')

  return (
    <div className={cardClass}>
      <div className={headerClass}>
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Week {weekNumber}</h3>
          {dateRange && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{dateRange}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === 'past-complete' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Done
            </span>
          )}
          {status === 'past-incomplete' && (
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Ended</span>
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{completed}/{activeSessions.length}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeSessions
            .sort((a, b) => {
              if (!a.scheduled_date) return 1
              if (!b.scheduled_date) return -1
              return a.scheduled_date.localeCompare(b.scheduled_date)
            })
            .map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                pendingPart={
                  session.session_type === 'brick'
                    ? weekBrickParts[0]
                    : undefined
                }
              />
            ))}
        </div>
        {restCount > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{restNote}</p>
        )}
      </div>
    </div>
  )
}

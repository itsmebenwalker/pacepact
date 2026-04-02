import type { Session } from '@/types'
import SessionCard from './SessionCard'

interface Props {
  weekNumber: number
  sessions: Session[]
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

  // Append T12:00:00 so the date is unambiguous across timezones
  const start = new Date(`${dates[0]}T12:00:00`)
  const end = new Date(`${dates[dates.length - 1]}T12:00:00`)

  const startMonth = start.toLocaleDateString('en', { month: 'short' })
  const endMonth = end.toLocaleDateString('en', { month: 'short' })

  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${endMonth}`
  }

  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
}

export default function WeekView({ weekNumber, sessions }: Props) {
  const completed = sessions.filter((s) => s.completed).length
  const dateRange = weekDateRange(sessions)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 sm:px-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Week {weekNumber}</h3>
          {dateRange && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{dateRange}</span>
          )}
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{completed}/{sessions.length}</span>
      </div>
      <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sessions
          .sort((a, b) => {
            if (!a.scheduled_date) return 1
            if (!b.scheduled_date) return -1
            return a.scheduled_date.localeCompare(b.scheduled_date)
          })
          .map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
      </div>
    </div>
  )
}

import type { Session } from '@/types'
import SessionCard from './SessionCard'

interface Props {
  weekNumber: number
  sessions: Session[]
}

export default function WeekView({ weekNumber, sessions }: Props) {
  const completed = sessions.filter((s) => s.completed).length

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Week {weekNumber}</h3>
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

import type { Session } from '@/types'
import SessionCard from './SessionCard'

interface Props {
  weekNumber: number
  sessions: Session[]
}

export default function WeekView({ weekNumber, sessions }: Props) {
  const completed = sessions.filter((s) => s.completed).length

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Week {weekNumber}</h3>
        <span className="text-xs text-gray-400">{completed}/{sessions.length} done</span>
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

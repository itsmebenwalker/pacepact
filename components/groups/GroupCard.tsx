import Link from 'next/link'
import { Group } from '@/types'

const EVENT_LABELS: Record<string, string> = {
  marathon: 'Marathon',
  half_marathon: 'Half Marathon',
  triathlon: 'Triathlon',
  cycling: 'Cycling',
  obstacle: 'Obstacle Race',
  custom: 'Event',
}

const AMBITION_LABELS: Record<string, string> = {
  finish: 'Just finish',
  pb: 'Beat my PB',
  podium: 'Podium',
}

interface Props {
  group: Group & { my_points: number }
  myPoints: number
}

export default function GroupCard({ group }: Props) {
  const daysUntil = Math.ceil(
    (new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Link href={`/groups/${group.id}`}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 mr-3">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50 truncate">{group.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{group.event_name}</p>
          </div>
          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium px-2 py-1 rounded shrink-0">
            {EVENT_LABELS[group.event_type] ?? group.event_type}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <span>{daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}</span>
          <span>{AMBITION_LABELS[group.ambition]}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Your points</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{group.my_points}</span>
        </div>
      </div>
    </Link>
  )
}

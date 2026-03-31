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
  podium: 'Go for podium',
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">{group.name}</h2>
            <p className="text-sm text-gray-500">{group.event_name}</p>
          </div>
          <span className="text-xs bg-orange-50 text-orange-600 font-medium px-2 py-1 rounded-full">
            {EVENT_LABELS[group.event_type] ?? group.event_type}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day!'}
          </span>
          <span className="text-gray-500">{AMBITION_LABELS[group.ambition]}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Your points</span>
          <span className="font-bold text-orange-500">{group.my_points}</span>
        </div>
      </div>
    </Link>
  )
}

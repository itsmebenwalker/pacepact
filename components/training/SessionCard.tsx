import type { Session } from '@/types'

const SESSION_ICONS: Record<string, string> = {
  run: '🏃',
  ride: '🚴',
  swim: '🏊',
  brick: '🔥',
  rest: '😴',
}

const SESSION_COLORS: Record<string, string> = {
  run: 'bg-blue-50 border-blue-200',
  ride: 'bg-green-50 border-green-200',
  swim: 'bg-cyan-50 border-cyan-200',
  brick: 'bg-red-50 border-red-200',
  rest: 'bg-gray-50 border-gray-200',
}

interface Props {
  session: Session
}

export default function SessionCard({ session }: Props) {
  const isCompleted = session.completed
  const icon = SESSION_ICONS[session.session_type] ?? '📋'
  const colorClass = SESSION_COLORS[session.session_type] ?? 'bg-gray-50 border-gray-200'

  return (
    <div className={`relative border rounded-lg p-3 text-sm ${isCompleted ? 'opacity-60 bg-gray-50 border-gray-200' : colorClass}`}>
      {isCompleted && (
        <div className="absolute top-2 right-2 text-green-500 text-base">✓</div>
      )}
      <div className="flex items-start gap-2">
        <span className="text-lg leading-tight">{icon}</span>
        <div className="min-w-0">
          <p className={`font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {session.target_description}
          </p>
          {(session.target_distance_km || session.target_duration_minutes) && (
            <p className="text-gray-400 text-xs mt-0.5">
              {session.target_distance_km ? `${session.target_distance_km} km` : ''}
              {session.target_distance_km && session.target_duration_minutes ? ' · ' : ''}
              {session.target_duration_minutes ? `${session.target_duration_minutes} min` : ''}
            </p>
          )}
          {isCompleted && session.points_awarded > 0 && (
            <p className="text-green-600 text-xs font-medium mt-0.5">+{session.points_awarded} pts</p>
          )}
        </div>
      </div>
    </div>
  )
}

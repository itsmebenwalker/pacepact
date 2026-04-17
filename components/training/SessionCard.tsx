import type { BrickActivityPart, Session } from '@/types'
import BrickProgress from './BrickProgress'

const SESSION_LABEL: Record<string, string> = {
  run: 'Run',
  ride: 'Ride',
  swim: 'Swim',
  brick: 'Brick',
  rest: 'Rest',
}

interface Props {
  session: Session
  pendingPart?: BrickActivityPart
}

export default function SessionCard({ session, pendingPart }: Props) {
  const isCompleted = session.completed
  const label = SESSION_LABEL[session.session_type] ?? session.session_type.toUpperCase()

  return (
    <div className={`relative border rounded-md p-3 text-sm transition-colors ${
      isCompleted
        ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60'
        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
        {isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <p className={`font-medium leading-snug ${
        isCompleted
          ? 'text-zinc-400 dark:text-zinc-500 line-through'
          : 'text-zinc-900 dark:text-zinc-50'
      }`}>
        {session.target_description}
      </p>
      {(session.target_distance_km || session.target_duration_minutes) && (
        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
          {session.target_distance_km ? `${session.target_distance_km} km` : ''}
          {session.target_distance_km && session.target_duration_minutes ? ' · ' : ''}
          {session.target_duration_minutes ? `${session.target_duration_minutes} min` : ''}
        </p>
      )}
      {isCompleted && (
        <div className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 space-y-1.5">
          <p>
            {session.completed_at
              ? new Date(session.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
              : 'Completed'}
            {session.points_awarded > 0 && (
              <span className="font-medium"> · +{session.points_awarded} pts</span>
            )}
          </p>
          {session.strava_activity_id && (
            <a
              href={`https://www.strava.com/activities/${session.strava_activity_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-[#FC5200] hover:opacity-80 transition-opacity"
            >
              View on Strava
            </a>
          )}
        </div>
      )}
      {pendingPart && !isCompleted && (
        <BrickProgress part={pendingPart} />
      )}
    </div>
  )
}

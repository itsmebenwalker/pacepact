'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BrickActivityPart, Session } from '@/types'
import BrickProgress from './BrickProgress'

const SESSION_LABEL: Record<string, string> = {
  run: 'Run',
  ride: 'Ride',
  swim: 'Swim',
  brick: 'Brick',
  rest: 'Rest',
}

const DEFAULT_TIPS: Record<string, string> = {
  run: 'Keep a conversational pace. Consistency beats intensity.',
  ride: 'Stay seated on climbs and focus on a smooth cadence.',
  swim: 'Long, efficient strokes — relax and glide between pulls.',
  brick: 'Move quickly through transition and settle into your run rhythm.',
  rest: 'Rest is training. Prioritize sleep and hydration today.',
}

interface Props {
  session: Session
  pendingPart?: BrickActivityPart
}

export default function SessionCard({ session, pendingPart }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isCompleted = session.completed
  const label = SESSION_LABEL[session.session_type] ?? session.session_type.toUpperCase()
  const tip = session.tip ?? DEFAULT_TIPS[session.session_type] ?? null

  const canMarkDone = !isCompleted && (() => {
    if (!session.scheduled_date) return true
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr)
    const daysUntilSunday = today.getDay() === 0 ? 0 : 7 - today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + daysUntilSunday)
    return session.scheduled_date <= sunday.toISOString().split('T')[0]
  })()

  async function markDone() {
    setLoading(true)
    await fetch(`/api/sessions/${session.id}/complete`, { method: 'POST' })
    setLoading(false)
    setSheetOpen(false)
    router.refresh()
  }

  async function assignBrickPart() {
    if (!pendingPart) return
    setLoading(true)
    await fetch('/api/activities/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brick_part_id: pendingPart.id }),
    })
    setLoading(false)
    setSheetOpen(false)
    router.refresh()
  }

  return (
    <>
      <div
        className={`relative border rounded-md p-3 text-sm transition-colors cursor-pointer sm:cursor-default ${
          isCompleted
            ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setSheetOpen(true)}
        aria-label={`${label}: ${session.target_description}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {tip && (
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Training tip"
                  className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 focus:outline-none focus:text-zinc-500 transition-colors mt-0.5"
                  onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </button>
                <div
                  role="tooltip"
                  className="absolute right-0 top-6 z-20 w-48 p-2 rounded bg-zinc-800 dark:bg-zinc-200 text-zinc-50 dark:text-zinc-900 text-xs leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-opacity pointer-events-none shadow-md"
                >
                  {tip}
                </div>
              </div>
            )}
            {isCompleted && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 dark:text-zinc-500 mt-0.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
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
          <div className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 space-y-1">
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
                onClick={(e) => e.stopPropagation()}
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

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-zinc-900 rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto" />

            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
              <p className="font-medium text-zinc-900 dark:text-zinc-50 mt-1 leading-snug">{session.target_description}</p>
              {(session.target_distance_km || session.target_duration_minutes) && (
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">
                  {session.target_distance_km ? `${session.target_distance_km} km` : ''}
                  {session.target_distance_km && session.target_duration_minutes ? ' · ' : ''}
                  {session.target_duration_minutes ? `${session.target_duration_minutes} min` : ''}
                </p>
              )}
            </div>

            {tip && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-md p-3 text-sm text-zinc-600 dark:text-zinc-300">
                {tip}
              </div>
            )}

            {isCompleted ? (
              session.strava_activity_id ? (
                <a
                  href={`https://www.strava.com/activities/${session.strava_activity_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 font-bold text-[#FC5200] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm"
                >
                  View on Strava
                </a>
              ) : null
            ) : (canMarkDone || pendingPart) ? (
              <div className="space-y-2">
                {canMarkDone && (
                  <button
                    onClick={markDone}
                    disabled={loading}
                    className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium rounded-md text-sm py-3 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40"
                  >
                    Mark done manually
                  </button>
                )}
                {pendingPart && (
                  <button
                    onClick={assignBrickPart}
                    disabled={loading}
                    className="w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md text-sm py-3 transition-colors bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Count as {pendingPart.activity_type} session instead
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}

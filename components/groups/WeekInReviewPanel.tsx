'use client'

import { useState } from 'react'
import type { Session } from '@/types'

interface MemberStat {
  user_id: string
  display_name: string | null
  completed: number
  total: number
  points: number
}

interface Props {
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
  currentUserId: string
  upcomingSessions: Session[]
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function Delta({ current, prior, label }: { current: number; prior: number; label: string }) {
  const diff = current - prior
  if (prior === 0) return <span className="text-zinc-400 dark:text-zinc-500 text-xs">{label}</span>
  return (
    <span className={`text-xs font-medium ${diff > 0 ? 'text-green-600 dark:text-green-400' : diff < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
      {diff > 0 ? `+${diff}` : diff === 0 ? '=' : diff} {label}
    </span>
  )
}

export default function WeekInReviewPanel({
  weekNumber,
  dateRange,
  teaser,
  myStats,
  priorStats,
  memberStats,
  currentUserId,
  upcomingSessions,
}: Props) {
  const [open, setOpen] = useState(false)

  const dateLabel = dateRange
    ? `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`
    : `Week ${weekNumber}`

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 shrink-0">
            Week in review
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:block truncate">
            {dateLabel} · {teaser}
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Your week */}
          <div className="px-4 py-4 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              Your week · {dateLabel}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {myStats.completed}/{myStats.total}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Sessions</p>
                  {priorStats.completed > 0 && (
                    <Delta current={myStats.completed} prior={priorStats.completed} label="vs last" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {myStats.points}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Points</p>
                  {priorStats.points > 0 && (
                    <Delta current={myStats.points} prior={priorStats.points} label="vs last" />
                  )}
                </div>
              </div>
              {myStats.distance > 0 && (
                <div>
                  <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {myStats.distance % 1 === 0 ? myStats.distance : myStats.distance.toFixed(1)}
                    <span className="text-sm font-normal text-zinc-400 dark:text-zinc-500 ml-0.5">km</span>
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Distance</p>
                </div>
              )}
              {myStats.duration > 0 && (
                <div>
                  <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatDuration(myStats.duration)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Time</p>
                </div>
              )}
            </div>
            {myStats.hasStreak && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                Streak active — you completed sessions in consecutive weeks
              </p>
            )}
          </div>

          {/* Group comparison */}
          <div className="px-4 py-4 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              How the group did
            </p>
            <div className="space-y-2">
              {memberStats.map((m, i) => {
                const isMe = m.user_id === currentUserId
                const name = m.display_name ?? 'Unknown'
                const pct = m.total > 0 ? (m.completed / m.total) * 100 : 0
                return (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 w-4 shrink-0 text-right">
                      {i + 1}
                    </span>
                    <span className={`text-sm min-w-0 truncate flex-1 ${isMe ? 'font-medium text-zinc-900 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-300'}`}>
                      {name}
                      {isMe && <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal ml-1">you</span>}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 w-10 text-right">
                        {m.completed}/{m.total}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 w-12 text-right">
                        {m.points} pts
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* This week's focus */}
          {upcomingSessions.length > 0 && (
            <div className="px-4 py-4 bg-white dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Up next
              </p>
              <div className="space-y-1.5">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide w-8 shrink-0">
                      {s.session_type.slice(0, 3)}
                    </span>
                    <span className="truncate">{s.target_description}</span>
                    {(s.target_distance_km || s.target_duration_minutes) && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                        {s.target_distance_km ? `${s.target_distance_km}km` : ''}
                        {s.target_distance_km && s.target_duration_minutes ? ' · ' : ''}
                        {s.target_duration_minutes ? formatDuration(s.target_duration_minutes) : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

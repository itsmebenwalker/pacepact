'use client'

import { useState } from 'react'
import Link from 'next/link'
import WeekView from './WeekView'
import type { BrickActivityPart, Session } from '@/types'

interface Props {
  groupId: string
  weeks: [number, Session[]][]
  today: string
  brickParts: BrickActivityPart[]
}

export default function TrainingPlanSection({ groupId, weeks, today, brickParts }: Props) {
  const [pastOpen, setPastOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Training plan</h2>
        <Link
          href={`/groups/${groupId}/plan`}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          View all weeks
        </Link>
      </div>

      {weeks.length === 0 ? (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">No sessions found.</p>
      ) : (
        <>
          {/* Desktop: first 4 weeks */}
          <div className="hidden sm:block space-y-3">
            {weeks.slice(0, 4).map(([weekNum, weekSessions]) => (
              <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} today={today} brickParts={brickParts} />
            ))}
          </div>

          {/* Mobile: current week + past weeks disclosure */}
          <div className="sm:hidden space-y-3">
            <WeekView
              weekNumber={weeks[0][0]}
              sessions={weeks[0][1]}
              today={today}
              brickParts={brickParts}
            />

            {weeks.length > 1 && (
              <>
                <button
                  onClick={() => setPastOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: pastOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  {pastOpen ? 'Hide' : `Past weeks (${Math.min(weeks.length - 1, 3)})`}
                </button>

                {pastOpen && (
                  <div className="space-y-3">
                    {weeks.slice(1, 4).map(([weekNum, weekSessions]) => (
                      <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} today={today} brickParts={brickParts} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

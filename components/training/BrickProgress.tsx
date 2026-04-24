'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BrickActivityPart } from '@/types'

interface Props {
  part: BrickActivityPart
  hasAssignableSession?: boolean
}

export default function BrickProgress({ part, hasAssignableSession }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAssign(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    await fetch('/api/activities/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brick_part_id: part.id }),
    })
    router.refresh()
  }

  async function handleDrop(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    await fetch('/api/activities/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brick_part_id: part.id }),
    })
    router.refresh()
  }

  const legLabel = part.activity_type === 'ride' ? 'Ride' : 'Run'

  const statsLabel = [
    part.distance_km != null ? `${part.distance_km.toFixed(1)}km` : null,
    part.duration_minutes != null ? `${Math.round(part.duration_minutes)}min` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-amber-400 dark:bg-amber-500 rounded-full" />
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">1 / 2</span>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {legLabel} received{statsLabel ? ` · ${statsLabel}` : ''}
      </p>
      <div className="flex items-center gap-2 sm:hidden">
        {hasAssignableSession !== false && (
          <button
            onClick={handleAssign}
            disabled={loading}
            className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors disabled:opacity-40"
          >
            {loading ? 'Saving…' : `Count as ${legLabel.toLowerCase()} session instead`}
          </button>
        )}
        {hasAssignableSession !== false && (
          <span className="text-[11px] text-zinc-300 dark:text-zinc-600">·</span>
        )}
        <button
          onClick={handleDrop}
          disabled={loading}
          className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2 transition-colors disabled:opacity-40"
        >
          {loading ? 'Saving…' : 'Drop'}
        </button>
      </div>
    </div>
  )
}

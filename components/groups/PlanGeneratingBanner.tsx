'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  groupId: string
  failed?: boolean
}

export default function PlanGeneratingBanner({ groupId, failed }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (failed) return
    const supabase = createClient()
    const channel = supabase
      .channel(`plan-status:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        (payload) => {
          const status = (payload.new as { plan_status?: string }).plan_status
          if (status === 'ready' || status === 'failed') router.refresh()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, failed, router])

  if (failed) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">Plan generation failed</p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
          Something went wrong while generating your training plan. Please contact support.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <svg className="animate-spin shrink-0 w-4 h-4 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Generating your training plan…</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            This takes 10–15 seconds. The plan will appear here automatically.
          </p>
        </div>
      </div>

      {/* Skeleton rows to suggest content is coming */}
      <div className="mt-4 space-y-2">
        {[80, 60, 72, 55, 68].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  )
}

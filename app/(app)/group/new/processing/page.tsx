'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.replace('/group/new')
      return
    }

    const supabase = createClient()
    let attempts = 0
    const MAX_ATTEMPTS = 15 // 30 seconds at 2s intervals

    const interval = setInterval(async () => {
      attempts++

      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single()

      if (group) {
        clearInterval(interval)
        router.replace(`/group/${group.id}`)
        return
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval)
        setTimedOut(true)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, router])

  if (timedOut) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">Taking longer than expected</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your payment went through. Your group should appear shortly — check your groups page.
          </p>
          <a
            href="/groups"
            className="inline-block text-sm font-medium text-zinc-900 dark:text-zinc-50 underline underline-offset-2"
          >
            Go to my groups
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <svg className="animate-spin w-8 h-8 text-zinc-400 mx-auto" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Setting up your group…</p>
      </div>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense>
      <ProcessingContent />
    </Suspense>
  )
}

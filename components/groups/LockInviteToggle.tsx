'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  inviteLocked: boolean
}

export default function LockInviteToggle({ groupId, inviteLocked }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_invite_lock' }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 ${
          inviteLocked
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-400'
            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
        }`}
      >
        {loading ? 'Updating...' : inviteLocked ? 'Unlock invites' : 'Lock invites'}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  userId: string
  displayName: string
}

export default function KickMemberButton({ groupId, userId, displayName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
  }

  async function handleKick() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 px-2 py-1 rounded-md transition-colors"
      >
        Kick
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={handleClose} />

          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Remove member
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Remove <span className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</span> from
              the group? They will also be blocked from rejoining via the invite link.
            </p>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium py-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleKick}
                disabled={loading}
                className="flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2 rounded-md transition-colors"
              >
                {loading ? 'Removing...' : 'Remove member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

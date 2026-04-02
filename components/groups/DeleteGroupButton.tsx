'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-right max-w-[200px]">
          Permanently deletes the group and all data for every member.
        </p>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-sm border border-red-300 dark:border-red-800 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Confirm delete'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-sm border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors"
    >
      Delete
    </button>
  )
}

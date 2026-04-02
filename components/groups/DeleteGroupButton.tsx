'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  eventName: string
}

export default function DeleteGroupButton({ groupId, eventName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setInput('')
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
  }

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

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-sm border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Delete group
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete the group, training plan, and message history for every member. This cannot be undone.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-700 dark:text-zinc-300">
                Type <span className="font-medium text-zinc-900 dark:text-zinc-50">{eventName}</span> to confirm
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={eventName}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors"
              />
            </div>
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
                onClick={handleDelete}
                disabled={input !== eventName || loading}
                className="flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2 rounded-md transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

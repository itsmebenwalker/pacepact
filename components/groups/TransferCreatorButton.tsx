'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  userId: string
  displayName: string
}

export default function TransferCreatorButton({ groupId, userId, displayName }: Props) {
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

  async function handleTransfer() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'make_creator' }),
    })

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
        className="text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-md transition-colors"
      >
        Make admin
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={handleClose} />

          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Transfer admin rights
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Make <span className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</span> the
              group admin? You will lose your admin rights and cannot undo this yourself.
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
                onClick={handleTransfer}
                disabled={loading}
                className="flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2 rounded-md transition-colors"
              >
                {loading ? 'Transferring...' : 'Transfer admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisconnectStravaButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDisconnect() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/strava/disconnect', { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (confirming) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This will disconnect your Strava account. Activities will no longer be tracked automatically. You can reconnect at any time.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium py-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded-md transition-colors"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors"
    >
      Disconnect Strava
    </button>
  )
}

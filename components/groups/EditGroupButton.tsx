'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  initialName: string
  initialEventName: string
}

export default function EditGroupButton({ groupId, initialName, initialEventName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [eventName, setEventName] = useState(initialEventName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setName(initialName)
    setEventName(initialEventName)
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, event_name: eventName }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors'
  const labelClass = 'block text-sm text-zinc-700 dark:text-zinc-300 mb-1.5'

  const unchanged = name.trim() === initialName && eventName.trim() === initialEventName

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={handleClose}
          />

          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit group</h2>

            <div>
              <label className={labelClass}>Group name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Event name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className={inputClass}
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
                onClick={handleSave}
                disabled={loading || !name.trim() || !eventName.trim() || unchanged}
                className="flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2 rounded-md transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

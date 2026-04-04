'use client'

import { useState } from 'react'

export default function EditNameField({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!draft.trim() || draft === name) {
      setEditing(false)
      setDraft(name)
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: draft }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save.')
      setLoading(false)
      return
    }

    setName(draft.trim())
    setEditing(false)
    setLoading(false)
  }

  function handleCancel() {
    setDraft(name)
    setEditing(false)
    setError(null)
  }

  if (editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-zinc-500 dark:text-zinc-400 text-sm">Name</span>
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors w-40"
          />
          <button
            onClick={handleSave}
            disabled={loading || !draft.trim()}
            className="text-xs font-medium text-zinc-900 dark:text-zinc-50 disabled:opacity-40"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs text-zinc-400 dark:text-zinc-500"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500 dark:text-zinc-400 text-sm">Name</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-900 dark:text-zinc-50 font-medium text-sm">{name}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

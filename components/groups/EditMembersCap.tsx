'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  currentCap: number
}

export default function EditMembersCap({ groupId, currentCap }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentCap)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function open() {
    setValue(currentCap)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  async function save() {
    if (value <= currentCap) {
      setError('New limit must be higher than the current limit')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_members_cap', members_cap: value }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <button
        onClick={open}
        className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors"
      >
        Edit
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={currentCap + 1}
        max={999}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-16 px-1.5 py-0.5 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 tabular-nums"
      />
      <button
        onClick={save}
        disabled={loading}
        className="text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 underline underline-offset-2 transition-colors disabled:opacity-40"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={cancel}
        disabled={loading}
        className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors disabled:opacity-40"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </span>
  )
}

'use client'

import { useState } from 'react'

interface Props {
  initialAdminMessage: boolean
  initialAnyMessage: boolean
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50 ${
        checked ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-zinc-900 shadow ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function NotificationSettings({ initialAdminMessage, initialAnyMessage }: Props) {
  const [adminMessage, setAdminMessage] = useState(initialAdminMessage)
  const [anyMessage, setAnyMessage] = useState(initialAnyMessage)

  async function update(field: 'notify_admin_message' | 'notify_any_message', value: boolean) {
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  function handleAdminMessage(value: boolean) {
    setAdminMessage(value)
    update('notify_admin_message', value)
  }

  function handleAnyMessage(value: boolean) {
    setAnyMessage(value)
    update('notify_any_message', value)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-900 dark:text-zinc-50">Admin messages</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">When the group admin posts in chat</p>
        </div>
        <Toggle checked={adminMessage} onChange={handleAdminMessage} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-900 dark:text-zinc-50">All messages</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">When anyone posts in the group chat</p>
        </div>
        <Toggle checked={anyMessage} onChange={handleAnyMessage} />
      </div>

      <div className="flex items-start gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <svg className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" x2="12" y1="8" y2="12"/>
          <line x1="12" x2="12.01" y1="16" y2="16"/>
        </svg>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Activity confirmations are always on — you&apos;ll always be notified when a Strava activity is matched and a session is signed off.
        </p>
      </div>
    </div>
  )
}

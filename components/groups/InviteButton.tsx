'use client'

import { useState } from 'react'

interface Props {
  inviteCode: string
}

export default function InviteButton({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/join/${inviteCode}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
    >
      {copied ? 'Copied' : 'Invite'}
    </button>
  )
}

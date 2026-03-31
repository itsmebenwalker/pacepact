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
      className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:border-orange-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
    >
      {copied ? '✓ Copied!' : '🔗 Invite friends'}
    </button>
  )
}

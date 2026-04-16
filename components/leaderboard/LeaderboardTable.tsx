'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupMember } from '@/types'

interface MemberRow {
  user_id: string
  points: number
  display_name: string | null
}

interface Props {
  groupId: string
  initialMembers: MemberRow[]
  currentUserId: string
}

export default function LeaderboardTable({ groupId, initialMembers, currentUserId }: Props) {
  const [members, setMembers] = useState<MemberRow[]>(
    [...initialMembers].sort((a, b) => b.points - a.points)
  )

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`leaderboard:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updated = payload.new as GroupMember
          setMembers((prev) => {
            const next = prev.map((m) =>
              m.user_id === updated.user_id ? { ...m, points: updated.points } : m
            )
            return [...next].sort((a, b) => b.points - a.points)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  const LIMIT = 5
  const myRank = members.findIndex((m) => m.user_id === currentUserId)
  const isOutsideTop = myRank >= LIMIT
  const visibleMembers = members.slice(0, LIMIT)
  const me = isOutsideTop ? members[myRank] : null

  function Row({ member, rank }: { member: MemberRow; rank: number }) {
    const isMe = member.user_id === currentUserId
    return (
      <div className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:gap-4 ${isMe ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}>
        <span className={`w-5 text-center font-medium text-xs tabular-nums ${rank === 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {rank + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {member.display_name ?? 'Athlete'}
          {isMe && <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-normal">you</span>}
        </span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{member.points}</span>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Leaderboard</h2>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleMembers.map((member, i) => (
          <Row key={member.user_id} member={member} rank={i} />
        ))}
        {isOutsideTop && me && (
          <>
            <div className="flex items-center gap-3 px-4 py-1.5 sm:px-5">
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
            </div>
            <Row member={me} rank={myRank} />
          </>
        )}
      </div>
    </div>
  )
}

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

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Leaderboard</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {members.map((member, i) => (
          <div
            key={member.user_id}
            className={`flex items-center gap-4 px-5 py-3 ${
              member.user_id === currentUserId ? 'bg-orange-50' : ''
            }`}
          >
            <span className={`w-6 text-center font-bold text-sm ${
              i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'
            }`}>
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-gray-900">
              {member.display_name ?? 'Athlete'}
              {member.user_id === currentUserId && (
                <span className="ml-2 text-xs text-orange-500 font-normal">(you)</span>
              )}
            </span>
            <span className="font-bold text-orange-500">{member.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}

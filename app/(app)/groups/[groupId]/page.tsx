export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import WeekView from '@/components/training/WeekView'
import InviteButton from '@/components/groups/InviteButton'
import DeleteGroupButton from '@/components/groups/DeleteGroupButton'
import MessageBoard from '@/components/groups/MessageBoard'
import Link from 'next/link'
import { sortWeeks } from '@/lib/utils/week-status'
import type { Session } from '@/types'

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single(),
    supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user!.id)
      .maybeSingle(),
  ])

  if (!group) notFound()
  if (!membership) notFound()

  const { data: membersRaw } = await supabase
    .from('group_members')
    .select('user_id, points, profiles(display_name)')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  interface ProfileResult { display_name: string | null }

  const members = (membersRaw ?? []).map((m) => ({
    user_id: m.user_id,
    points: m.points,
    display_name: (m.profiles as unknown as ProfileResult)?.display_name ?? null,
  }))

  const { data: messagesRaw } = await supabase
    .from('messages')
    .select('id, user_id, content, created_at, profiles(display_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(100)

  interface MessageProfileResult { display_name: string | null }

  const initialMessages = (messagesRaw ?? []).map((m) => ({
    id: m.id as string,
    user_id: m.user_id as string,
    content: m.content as string,
    created_at: m.created_at as string,
    display_name: (m.profiles as unknown as MessageProfileResult)?.display_name ?? null,
  }))

  const memberNames: Record<string, string | null> = {}
  for (const m of members) {
    memberNames[m.user_id] = m.display_name
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user!.id)
    .order('scheduled_date', { ascending: true })

  const sessionsByWeek = new Map<number, Session[]>()
  for (const session of sessions ?? []) {
    const week = session.week_number
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, [])
    sessionsByWeek.get(week)!.push(session as Session)
  }

  const today = new Date().toISOString().split('T')[0]
  const weeks = sortWeeks(Array.from(sessionsByWeek.entries()), today)

  const daysUntil = Math.ceil(
    (new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{group.name}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-sm">
            {group.event_name} · {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {group.created_by === user!.id && (
            <DeleteGroupButton groupId={group.id} />
          )}
          <InviteButton inviteCode={group.invite_code} />
        </div>
      </div>

      <LeaderboardTable
        groupId={group.id}
        initialMembers={members}
        currentUserId={user!.id}
      />

      <MessageBoard
        groupId={group.id}
        currentUserId={user!.id}
        initialMessages={initialMessages}
        memberNames={memberNames}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Training plan</h2>
          <Link
            href={`/groups/${group.id}/plan`}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            View all weeks
          </Link>
        </div>

        {weeks.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-500 text-sm">No sessions found.</p>
        ) : (
          <div className="space-y-3">
            {weeks.slice(0, 4).map(([weekNum, weekSessions]) => (
              <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} today={today} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

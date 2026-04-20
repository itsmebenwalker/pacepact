export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import TrainingPlanSection from '@/components/training/TrainingPlanSection'
import GroupActionsMenu from '@/components/groups/GroupActionsMenu'
import MessageBoard from '@/components/groups/MessageBoard'
import WeekInReview from '@/components/groups/WeekInReview'
import { sortWeeks } from '@/lib/utils/week-status'
import { getLocalToday } from '@/lib/utils/local-date'
import type { BrickActivityPart, Session } from '@/types'

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!group) notFound()
  if (!membership) notFound()

  const serviceClient = createServiceClient()
  const { data: membersRaw } = await serviceClient
    .from('group_members')
    .select('user_id, points, profiles(display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  interface ProfileResult { display_name: string | null; avatar_url: string | null }

  const members = (membersRaw ?? []).map((m) => ({
    user_id: m.user_id,
    points: m.points,
    display_name: (m.profiles as unknown as ProfileResult)?.display_name ?? null,
    avatar_url: (m.profiles as unknown as ProfileResult)?.avatar_url ?? null,
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
  const memberAvatars: Record<string, string | null> = {}
  for (const m of members) {
    memberNames[m.user_id] = m.display_name
    memberAvatars[m.user_id] = m.avatar_url
  }

  const [{ data: sessions }, { data: brickPartsRaw }] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('brick_activity_parts')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id),
  ])

  const brickParts = (brickPartsRaw ?? []) as BrickActivityPart[]

  const sessionsByWeek = new Map<number, Session[]>()
  for (const session of sessions ?? []) {
    const week = session.week_number
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, [])
    sessionsByWeek.get(week)!.push(session as Session)
  }

  const today = await getLocalToday()
  const weeks = sortWeeks(Array.from(sessionsByWeek.entries()), today)

  const daysUntil = Math.ceil(
    (new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-5 sm:space-y-8 pb-20 sm:pb-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{group.name}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-sm">
            {group.event_name} · {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}
          </p>
        </div>
        <GroupActionsMenu
          groupId={group.id}
          groupName={group.name}
          eventName={group.event_name}
          inviteCode={group.invite_code}
          inviteLocked={group.invite_locked}
          allowManualComplete={group.allow_manual_complete ?? true}
          isCreator={group.created_by === user.id}
        />
      </div>

      <WeekInReview
        groupId={group.id}
        currentUserId={user.id}
        members={members}
      />

      <LeaderboardTable
        groupId={group.id}
        initialMembers={members}
        currentUserId={user.id}
      />

      <MessageBoard
        groupId={group.id}
        currentUserId={user.id}
        initialMessages={initialMessages}
        memberNames={memberNames}
        memberAvatars={memberAvatars}
      />

      <TrainingPlanSection
        groupId={group.id}
        weeks={weeks}
        today={today}
        brickParts={brickParts}
        allowManualComplete={group.allow_manual_complete ?? true}
      />
    </div>
  )
}

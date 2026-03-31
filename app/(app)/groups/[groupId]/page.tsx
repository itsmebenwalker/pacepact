import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import WeekView from '@/components/training/WeekView'
import InviteButton from '@/components/groups/InviteButton'
import Link from 'next/link'
import type { Session } from '@/types'

export default async function GroupPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase
      .from('groups')
      .select('*')
      .eq('id', params.groupId)
      .single(),
    supabase
      .from('group_members')
      .select('*')
      .eq('group_id', params.groupId)
      .eq('user_id', user!.id)
      .maybeSingle(),
  ])

  if (!group) notFound()
  if (!membership) notFound() // not a member

  // Load leaderboard members with profiles
  const { data: membersRaw } = await supabase
    .from('group_members')
    .select('user_id, points, profiles(display_name)')
    .eq('group_id', params.groupId)
    .order('points', { ascending: false })

  const members = (membersRaw ?? []).map((m) => ({
    user_id: m.user_id,
    points: m.points,
    display_name: (m.profiles as any)?.display_name ?? null,
  }))

  // Load user's sessions grouped by week
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', params.groupId)
    .eq('user_id', user!.id)
    .order('scheduled_date', { ascending: true })

  const sessionsByWeek = new Map<number, Session[]>()
  for (const session of sessions ?? []) {
    const week = session.week_number
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, [])
    sessionsByWeek.get(week)!.push(session as Session)
  }

  const weeks = Array.from(sessionsByWeek.entries()).sort(([a], [b]) => a - b)

  const daysUntil = Math.ceil(
    (new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-gray-500 mt-0.5">
            {group.event_name} · {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day!'}
          </p>
        </div>
        <InviteButton inviteCode={group.invite_code} />
      </div>

      {/* Leaderboard */}
      <LeaderboardTable
        groupId={group.id}
        initialMembers={members}
        currentUserId={user!.id}
      />

      {/* Training Plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Your training plan</h2>
          <Link
            href={`/groups/${group.id}/plan`}
            className="text-sm text-orange-500 hover:underline"
          >
            View full plan →
          </Link>
        </div>

        {weeks.length === 0 ? (
          <p className="text-gray-400 text-sm">No sessions found.</p>
        ) : (
          <div className="space-y-4">
            {weeks.slice(0, 4).map(([weekNum, weekSessions]) => (
              <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

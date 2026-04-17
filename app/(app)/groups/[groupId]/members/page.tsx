export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import KickMemberButton from '@/components/groups/KickMemberButton'
import TransferCreatorButton from '@/components/groups/TransferCreatorButton'

interface ProfileResult { display_name: string | null; strava_athlete_id: number | null }

export default async function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from('groups').select('id, name, event_name, created_by').eq('id', groupId).single(),
    supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ])

  if (!group || !membership) notFound()

  const isCreator = group.created_by === user.id

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, points, joined_at, profiles(display_name, strava_athlete_id)')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Members</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-sm">{group.name}</p>
        </div>
        <Link
          href={`/groups/${groupId}`}
          className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
        >
          Back
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {(members ?? []).map((m, i) => {
            const profile = m.profiles as unknown as ProfileResult
            const isConnected = !!profile?.strava_athlete_id
            const isCurrentUser = m.user_id === user.id
            const isGroupCreator = m.user_id === group.created_by
            const displayName = profile?.display_name ?? 'Athlete'

            return (
              <div
                key={m.user_id}
                className={`flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4 ${isCurrentUser ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}
              >
                <span className="w-5 text-center font-medium text-xs tabular-nums text-zinc-300 dark:text-zinc-600">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-normal">you</span>
                    )}
                    {isGroupCreator && (
                      <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-normal">admin</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {isConnected ? 'Strava connected' : 'Strava not connected'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {m.points} pts
                </span>
                {isCreator && !isCurrentUser && (
                  <div className="flex items-center gap-2">
                    <KickMemberButton
                      groupId={groupId}
                      userId={m.user_id}
                      displayName={displayName}
                    />
                    <TransferCreatorButton
                      groupId={groupId}
                      userId={m.user_id}
                      displayName={displayName}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

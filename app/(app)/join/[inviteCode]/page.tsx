import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fanOutSessionsForUser } from '@/lib/groups/fan-out'
import { evaluateJoinGate } from '@/lib/groups/join-gate'

export default async function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/join/${inviteCode}`)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single()

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Invalid invite link.</p>
      </div>
    )
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/groups/${group.id}`)
  }

  const { data: ban } = await supabase
    .from('group_member_bans')
    .select('group_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const gate = evaluateJoinGate(group.invite_locked, !!ban)

  if (!gate.allowed && gate.reason === 'locked') {
    return (
      <div className="max-w-sm mx-auto text-center py-20 space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Invites closed</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{group.name}</span>{' '}
          is no longer accepting new members.
        </p>
      </div>
    )
  }

  if (!gate.allowed && gate.reason === 'banned') {
    return (
      <div className="max-w-sm mx-auto text-center py-20 space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Access denied</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          You are not permitted to join{' '}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{group.name}</span>.
        </p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('strava_athlete_id')
    .eq('id', user.id)
    .single()

  if (!profile?.strava_athlete_id) {
    return (
      <div className="max-w-sm mx-auto text-center py-20 space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Connect Strava first</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          You need to connect your Strava account before joining{' '}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{group.name}</span>.
          PacePact uses Strava to automatically mark your sessions complete.
        </p>
        <a
          href="/profile"
          className="inline-block bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium px-5 py-2.5 rounded-md text-sm transition-colors"
        >
          Go to Profile
        </a>
      </div>
    )
  }

  const serviceClient = createServiceClient()

  await serviceClient.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    points: 0,
  })

  await fanOutSessionsForUser(serviceClient, group, user.id)

  redirect(`/groups/${group.id}`)
}

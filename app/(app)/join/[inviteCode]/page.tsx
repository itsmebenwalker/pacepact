import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fanOutSessionsForUser } from '@/lib/groups/fan-out'

export default async function JoinPage({ params }: { params: { inviteCode: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/join/${params.inviteCode}`)
  }

  // Look up group
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', params.inviteCode)
    .single()

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Invalid invite link.</p>
      </div>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/groups/${group.id}`)
  }

  // Check Strava connected
  const { data: profile } = await supabase
    .from('profiles')
    .select('strava_athlete_id')
    .eq('id', user.id)
    .single()

  if (!profile?.strava_athlete_id) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Connect Strava first</h1>
        <p className="text-gray-500 text-sm">
          You need to connect your Strava account before joining <strong>{group.name}</strong>.
          PacePact uses Strava to automatically mark your sessions complete.
        </p>
        <a
          href={`/profile`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Go to Profile → Connect Strava
        </a>
      </div>
    )
  }

  // Join the group
  const serviceClient = createServiceClient()

  await serviceClient.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    points: 0,
  })

  // Fan out sessions to new member
  await fanOutSessionsForUser(serviceClient, group, user.id)

  redirect(`/groups/${group.id}`)
}

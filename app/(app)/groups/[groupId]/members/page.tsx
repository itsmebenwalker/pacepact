import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface ProfileResult { display_name: string | null; strava_athlete_id: number | null }

export default async function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from('groups').select('id, name, event_name').eq('id', groupId).single(),
    supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user!.id).maybeSingle(),
  ])

  if (!group || !membership) notFound()

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, points, joined_at, profiles(display_name, strava_athlete_id)')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/groups/${groupId}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 text-sm">{group.name}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {(members ?? []).map((m, i) => {
            const profile = m.profiles as unknown as ProfileResult
            const isConnected = !!profile?.strava_athlete_id
            return (
              <div key={m.user_id} className={`flex items-center gap-4 px-5 py-4 ${m.user_id === user!.id ? 'bg-orange-50' : ''}`}>
                <span className="w-6 text-center font-bold text-sm text-gray-300">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {profile?.display_name ?? 'Athlete'}
                    {m.user_id === user!.id && <span className="ml-2 text-xs text-orange-500">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isConnected ? '🟢 Strava connected' : '⚪ Strava not connected'}
                  </p>
                </div>
                <span className="font-bold text-orange-500">{m.points} pts</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

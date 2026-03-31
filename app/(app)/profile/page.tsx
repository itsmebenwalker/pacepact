import { createClient } from '@/lib/supabase/server'
import { getStravaAuthUrl } from '@/lib/strava/oauth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`
  const stravaAuthUrl = getStravaAuthUrl(redirectUri)
  const isStravaConnected = !!profile?.strava_athlete_id

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Account</h2>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-gray-900">{profile?.display_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="text-gray-900">{user!.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Strava</h2>

        {isStravaConnected ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Connected</p>
              <p className="text-xs text-gray-400">Athlete ID: {profile.strava_athlete_id}</p>
            </div>
            <span className="ml-auto text-green-500 text-sm font-medium">✓</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Connect Strava so PacePact can automatically mark sessions complete when you log activities.
            </p>
            <a
              href={stravaAuthUrl}
              className="inline-flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04400] text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Connect with Strava
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getStravaAuthUrl } from '@/lib/strava/oauth'
import DeleteAccountButton from '@/components/profile/DeleteAccountButton'
import DisconnectStravaButton from '@/components/profile/DisconnectStravaButton'
import EditNameField from '@/components/profile/EditNameField'
import NotificationSettings from '@/components/profile/NotificationSettings'

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
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Profile</h1>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Account</h2>
        <div className="text-sm space-y-3">
          <EditNameField initialName={profile?.display_name ?? ''} />
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Email</span>
            <span className="text-zinc-900 dark:text-zinc-50 font-medium">{user!.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Strava</h2>

        {isStravaConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-50 rounded-md flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold shrink-0">
                S
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Connected</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Athlete ID: {profile.strava_athlete_id}</p>
              </div>
            </div>
            <DisconnectStravaButton />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Connect Strava so PacePact can automatically mark sessions complete when you log activities.
            </p>
            <a
              href={stravaAuthUrl}
              className="inline-flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04400] text-white font-medium px-4 py-2 rounded-md text-sm transition-colors"
            >
              Connect with Strava
            </a>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Notifications</h2>
        <NotificationSettings
          initialAdminMessage={profile?.notify_admin_message ?? false}
          initialAnyMessage={profile?.notify_any_message ?? false}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Danger zone</h2>
        <DeleteAccountButton />
      </div>
    </div>
  )
}

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
              <div className="w-2.5 h-2.5 rounded-full bg-[#FC5200] shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Connected</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  <a
                    href={`https://www.strava.com/athletes/${profile.strava_athlete_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#FC5200] transition-colors"
                  >
                    View your Strava profile
                  </a>
                </p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/powered-by-strava.svg" alt="Powered by Strava" width={150} height={28} className="h-6 w-auto" />
            <DisconnectStravaButton />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Connect Strava so PacePact can automatically mark sessions complete when you log activities. We only read your activity data to match completed sessions — we never post on your behalf.
            </p>
            <a href={stravaAuthUrl}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/connect-with-strava.svg" alt="Connect with Strava" width={193} height={48} className="h-12 w-auto" />
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

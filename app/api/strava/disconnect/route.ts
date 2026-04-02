import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('strava_access_token, strava_athlete_id')
    .eq('id', user.id)
    .single()

  if (!profile?.strava_athlete_id) {
    return NextResponse.json({ error: 'No Strava account connected' }, { status: 400 })
  }

  // Deauthorize with Strava — this revokes the token and stops webhook events for this athlete
  if (profile.strava_access_token) {
    try {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: profile.strava_access_token }),
      })
    } catch (e) {
      console.error('Strava deauthorize request failed:', e)
      // Continue — still clear our side even if Strava's call fails
    }
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('profiles')
    .update({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect Strava' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/strava/oauth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/profile?error=strava_denied`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    const serviceClient = createServiceClient()
    await serviceClient.from('profiles').update({
      strava_athlete_id: tokens.athlete.id,
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      display_name: tokens.athlete.firstname
        ? `${tokens.athlete.firstname} ${tokens.athlete.lastname}`.trim()
        : undefined,
      avatar_url: tokens.athlete.profile ?? undefined,
    }).eq('id', user.id)

    return NextResponse.redirect(`${origin}/profile?strava=connected`)
  } catch (e) {
    console.error('Strava callback error:', e)
    return NextResponse.redirect(`${origin}/profile?error=strava_failed`)
  }
}

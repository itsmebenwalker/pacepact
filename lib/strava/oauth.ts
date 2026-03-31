import type { SupabaseClient } from '@supabase/supabase-js'
import type { StravaActivity, StravaTokenResponse } from '@/types'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export function getStravaAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`)
  }

  return res.json()
}

export async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
}> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`)
  }

  return res.json()
}

export async function getStravaActivity(
  activityId: number,
  accessToken: string
): Promise<StravaActivity> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Strava activity fetch failed: ${res.status}`)
  }

  return res.json()
}

export async function ensureFreshToken(
  supabase: SupabaseClient,
  profile: {
    id: string
    strava_access_token: string
    strava_refresh_token: string
    strava_token_expires_at: string
  }
): Promise<string> {
  const expiresAt = new Date(profile.strava_token_expires_at).getTime()
  const nowMs = Date.now()

  if (nowMs < expiresAt - 60_000) {
    return profile.strava_access_token
  }

  const refreshed = await refreshStravaToken(profile.strava_refresh_token)

  await supabase.from('profiles').update({
    strava_access_token: refreshed.access_token,
    strava_refresh_token: refreshed.refresh_token,
    strava_token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
  }).eq('id', profile.id)

  return refreshed.access_token
}

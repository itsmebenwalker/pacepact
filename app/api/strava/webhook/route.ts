import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { StravaWebhookPayload } from '@/types'

// Strava webhook subscription verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// Strava webhook event receiver — stores the event and returns 200 immediately.
// Processing is deferred: a cron job calls /api/strava/process-webhooks every
// minute and handles events in batches grouped by (owner_id, event_time).
// This ensures all legs of a Garmin multisport (brick) activity arrive before
// any matching logic runs.
export async function POST(request: Request) {
  const payload = await request.json() as StravaWebhookPayload

  const serviceClient = createServiceClient()

  await serviceClient.from('strava_webhook_events').insert({
    payload,
    processed: false,
    process_after: new Date(Date.now() + 30_000).toISOString(),
  })

  return NextResponse.json({ ok: true })
}

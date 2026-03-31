import { createServiceClient } from '@/lib/supabase/server'
import { processWebhookEvent } from '@/lib/strava/webhook'
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

// Strava webhook event receiver
export async function POST(request: Request) {
  // Always respond 200 immediately — Strava retries on non-200
  const payload = await request.json() as StravaWebhookPayload

  const serviceClient = createServiceClient()

  // Log raw payload
  await serviceClient.from('strava_webhook_events').insert({
    payload,
    processed: false,
  })

  // Process async (fire and forget — we already returned 200)
  processWebhookEvent(payload)
    .then(async () => {
      // Mark as processed
      await serviceClient
        .from('strava_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('payload->>object_id', payload.object_id.toString())
        .eq('processed', false)
    })
    .catch((e) => {
      console.error('Webhook processing error:', e)
    })

  return NextResponse.json({ ok: true })
}

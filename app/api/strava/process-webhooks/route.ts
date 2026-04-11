import { createServiceClient } from '@/lib/supabase/server'
import { processBatch } from '@/lib/strava/webhook'
import { NextResponse } from 'next/server'
import type { StravaWebhookPayload } from '@/types'

// Called every minute by a cron job (Railway cron or Supabase pg_cron + pg_net).
// Processes all webhook events whose process_after timestamp has elapsed,
// grouped by (owner_id, event_time) so that all legs of a multisport activity
// are handled together.
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const serviceClient = createServiceClient()

  const { data: dueEvents, error } = await serviceClient
    .from('strava_webhook_events')
    .select('id, payload')
    .eq('processed', false)
    .lte('process_after', new Date().toISOString())

  if (error) {
    console.error('Failed to fetch due webhook events:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  if (!dueEvents || dueEvents.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Group events by (owner_id, event_time) — all parts of a Garmin multisport
  // activity share the same owner_id and event_time
  const batches = new Map<string, Array<{ id: string; payload: StravaWebhookPayload }>>()
  for (const event of dueEvents) {
    const payload = event.payload as StravaWebhookPayload
    const key = `${payload.owner_id}:${payload.event_time}`
    const bucket = batches.get(key) ?? []
    bucket.push({ id: event.id, payload })
    batches.set(key, bucket)
  }

  let processed = 0
  for (const [, batch] of batches) {
    try {
      await processBatch(serviceClient, batch)

      await serviceClient
        .from('strava_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', batch.map((e) => e.id))

      processed += batch.length
    } catch (e) {
      console.error('Batch processing error:', e)
      // Continue with remaining batches — failed events stay unprocessed
    }
  }

  return NextResponse.json({ processed })
}

import { stripe } from '@/lib/stripe/client'
import { createGroup } from '@/lib/groups/create-group'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EventType, Ambition, OtherSport } from '@/types'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object
  const meta = session.metadata ?? {}

  try {
    if (meta.action === 'create_group') {
      await createGroup({
        name: meta.name,
        event_name: meta.event_name,
        event_type: meta.event_type as EventType,
        event_date: meta.event_date,
        ambition: meta.ambition as Ambition,
        other_sport: meta.other_sport ? (meta.other_sport as OtherSport) : undefined,
        other_distance_km: meta.other_distance_km || undefined,
        members_cap: Number(meta.members_cap),
        user_id: meta.user_id,
        stripe_session_id: session.id,
      })
    }

    if (meta.action === 'update_members_cap') {
      const serviceClient = createServiceClient()
      await serviceClient
        .from('groups')
        .update({ members_cap: Number(meta.new_cap) })
        .eq('id', meta.group_id)
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    // Return 200 regardless — Stripe will not retry on success codes.
    // Log the failure; it can be replayed from the Stripe dashboard.
  }

  return NextResponse.json({ received: true })
}

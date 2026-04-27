import { requireAuth } from '@/lib/supabase/server'
import { createGroup } from '@/lib/groups/create-group'
import { NextResponse } from 'next/server'
import type { EventType, Ambition, OtherSport } from '@/types'

export async function POST(request: Request) {
  // When payments are enabled, group creation only happens via the Stripe webhook.
  // Reject direct calls so the payment step cannot be bypassed.
  if (process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true') {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const body = await request.json()
  const { name, event_name, event_type, event_date, ambition, other_sport, other_distance_km, members_cap } = body as {
    name: string
    event_name: string
    event_type: EventType
    event_date: string
    ambition: Ambition
    other_sport?: OtherSport
    other_distance_km?: string
    members_cap?: number
  }

  if (!name || !event_name || !event_type || !event_date || !ambition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (event_type === 'other' && (!other_sport || !other_distance_km)) {
    return NextResponse.json({ error: 'Missing sport or distance for other event type' }, { status: 400 })
  }

  try {
    const { groupId } = await createGroup({
      name, event_name, event_type, event_date, ambition,
      other_sport, other_distance_km,
      members_cap,
      user_id: user.id,
    })
    return NextResponse.json({ groupId })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create group'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

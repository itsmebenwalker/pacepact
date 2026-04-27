import { requireAuth } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { calculateGroupPrice, calculateCapUpgradePrice } from '@/lib/payments/calculate-price'
import { NextResponse } from 'next/server'
import type { EventType, Ambition, OtherSport } from '@/types'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const body = await request.json()
  const { action } = body as { action: string }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (action === 'create_group') {
    const { name, event_name, event_type, event_date, ambition, other_sport, other_distance_km, members_cap } = body as {
      name: string
      event_name: string
      event_type: EventType
      event_date: string
      ambition: Ambition
      other_sport?: OtherSport
      other_distance_km?: string
      members_cap: number
    }

    if (!name || !event_name || !event_type || !event_date || !ambition || !members_cap) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (event_type === 'other' && (!other_sport || !other_distance_km)) {
      return NextResponse.json({ error: 'Missing sport or distance for other event type' }, { status: 400 })
    }

    const price = calculateGroupPrice(members_cap, event_date)

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `PacePact — ${name}`,
            description: `${members_cap} members · ${price.weeks} weeks · $0.05/seat/week`,
          },
          unit_amount: price.amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      ui_mode: 'embedded_page',
      return_url: `${appUrl}/group/new/processing?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        action: 'create_group',
        user_id: user.id,
        name,
        event_name,
        event_type,
        event_date,
        ambition,
        members_cap: String(members_cap),
        other_sport: other_sport ?? '',
        other_distance_km: other_distance_km ?? '',
      },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  }

  if (action === 'update_members_cap') {
    const { group_id, new_cap, current_cap, event_date } = body as {
      group_id: string
      new_cap: number
      current_cap: number
      event_date: string
    }

    if (!group_id || !new_cap || !current_cap || !event_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const deltaSeats = new_cap - current_cap
    if (deltaSeats <= 0) {
      return NextResponse.json({ error: 'New cap must be greater than current cap' }, { status: 400 })
    }

    const { data: group } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', group_id)
      .single()

    if (!group || group.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const price = calculateCapUpgradePrice(deltaSeats, event_date)

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'PacePact — Member limit increase',
            description: `+${deltaSeats} seat${deltaSeats === 1 ? '' : 's'} · ${price.weeks} weeks remaining · $0.05/seat/week`,
          },
          unit_amount: price.amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      ui_mode: 'embedded_page',
      return_url: `${appUrl}/group/${group_id}/members?upgraded=true`,
      metadata: {
        action: 'update_members_cap',
        group_id,
        new_cap: String(new_cap),
        user_id: user.id,
      },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

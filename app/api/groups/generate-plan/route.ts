import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { generateTrainingPlan } from '@/lib/claude/generate-plan'
import { fanOutSessionsForUser } from '@/lib/groups/fan-out'
import { NextResponse, after } from 'next/server'
import { nanoid } from 'nanoid'
import type { EventType, Ambition, OtherSport } from '@/types'

export async function POST(request: Request) {
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

  const serviceClient = createServiceClient()

  // Create the group immediately so the user can navigate away
  const { data: group, error: groupError } = await serviceClient
    .from('groups')
    .insert({
      name,
      event_name,
      event_type,
      event_date,
      ambition,
      members_cap: members_cap ?? null,
      training_plan: [],
      plan_status: 'generating',
      invite_code: nanoid(8),
      created_by: user.id,
    })
    .select()
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message ?? 'Failed to create group' }, { status: 500 })
  }

  await serviceClient.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    points: 0,
  })

  // Capture values needed in the background task before the request scope closes
  const userId = user.id
  const distanceKm = other_distance_km ? parseFloat(other_distance_km) : undefined

  after(async () => {
    try {
      const { sessions, raw } = await generateTrainingPlan(
        event_type, event_date, ambition, other_sport, distanceKm
      )

      await serviceClient
        .from('groups')
        .update({ training_plan: sessions, training_plan_raw: raw, plan_status: 'ready' })
        .eq('id', group.id)

      await fanOutSessionsForUser(serviceClient, { ...group, training_plan: sessions }, userId)

      await serviceClient.from('notifications').insert({
        user_id: userId,
        type: 'plan_ready',
        group_id: group.id,
        data: { group_name: name },
      })
    } catch (e) {
      console.error('Background plan generation error:', e)
      await serviceClient
        .from('groups')
        .update({ plan_status: 'failed' })
        .eq('id', group.id)
    }
  })

  return NextResponse.json({ groupId: group.id })
}

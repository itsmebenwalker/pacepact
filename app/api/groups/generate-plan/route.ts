import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateTrainingPlan } from '@/lib/claude/generate-plan'
import { fanOutSessionsForUser } from '@/lib/groups/fan-out'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import type { EventType, Ambition, OtherSport, TrainingSession } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, event_name, event_type, event_date, ambition, other_sport, other_distance_km } = body as {
    name: string
    event_name: string
    event_type: EventType
    event_date: string
    ambition: Ambition
    other_sport?: OtherSport
    other_distance_km?: string
  }

  if (!name || !event_name || !event_type || !event_date || !ambition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (event_type === 'other' && (!other_sport || !other_distance_km)) {
    return NextResponse.json({ error: 'Missing sport or distance for other event type' }, { status: 400 })
  }

  // Generate plan via Claude
  let sessions: TrainingSession[], raw: string
  try {
    ;({ sessions, raw } = await generateTrainingPlan(event_type, event_date, ambition, other_sport, other_distance_km ? parseFloat(other_distance_km) : undefined))
  } catch (e) {
    console.error('Plan generation error:', e)
    return NextResponse.json({ error: 'Failed to generate training plan. Please try again.' }, { status: 500 })
  }

  const serviceClient = createServiceClient()

  // Create the group
  const { data: group, error: groupError } = await serviceClient
    .from('groups')
    .insert({
      name,
      event_name,
      event_type,
      event_date,
      ambition,
      training_plan: sessions,
      training_plan_raw: raw,
      invite_code: nanoid(8),
      created_by: user.id,
    })
    .select()
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message ?? 'Failed to create group' }, { status: 500 })
  }

  // Add creator as first member
  await serviceClient.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    points: 0,
  })

  // Fan out sessions to creator
  await fanOutSessionsForUser(serviceClient, group, user.id)

  return NextResponse.json({ groupId: group.id })
}

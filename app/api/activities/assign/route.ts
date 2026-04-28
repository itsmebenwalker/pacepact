import { NextResponse } from 'next/server'
import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/points/calculator'
import { checkStreak } from '@/lib/strava/webhook'
import { getWeekBounds } from '@/lib/strava/activity-matcher'
import type { Session, StravaActivity } from '@/types'

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const body = await request.json()
  const { brick_part_id } = body
  if (!brick_part_id) return NextResponse.json({ error: 'Missing brick_part_id' }, { status: 400 })

  const serviceClient = createServiceClient()
  const { data: part } = await serviceClient
    .from('brick_activity_parts')
    .select('id')
    .eq('id', brick_part_id)
    .eq('user_id', user.id)
    .single()

  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await serviceClient.from('brick_activity_parts').delete().eq('id', brick_part_id)
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const body = await request.json()
  const { brick_part_id, session_id } = body
  if (!brick_part_id) return NextResponse.json({ error: 'Missing brick_part_id' }, { status: 400 })

  const serviceClient = createServiceClient()

  // Fetch the brick part and verify the user owns it
  const { data: part } = await serviceClient
    .from('brick_activity_parts')
    .select('*')
    .eq('id', brick_part_id)
    .eq('user_id', user.id)
    .single()

  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!part.group_id) return NextResponse.json({ error: 'Part has no group context' }, { status: 422 })

  const activityDate = part.activity_date ?? new Date(part.created_at).toISOString().split('T')[0]

  let session: Session

  if (session_id) {
    // User selected a specific session — fetch and validate it
    const { data: specificSession } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .eq('group_id', part.group_id)
      .eq('completed', false)
      .eq('session_type', part.activity_type)
      .single()

    if (!specificSession) {
      return NextResponse.json({ error: 'Session not found or already completed' }, { status: 404 })
    }
    session = specificSession as Session
  } else {
    // Fall back to earliest matching session in the week
    const { start: weekStart, end: weekEnd } = getWeekBounds(activityDate)

    const { data: candidates } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('group_id', part.group_id)
      .eq('user_id', user.id)
      .eq('session_type', part.activity_type)
      .eq('completed', false)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true })

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No matching session found for this week' }, { status: 404 })
    }

    session = candidates[0] as Session
  }

  // Reconstruct a StravaActivity from the stored part stats for points calculation
  const fakeActivity: StravaActivity = {
    id: part.strava_activity_id ?? 0,
    name: part.activity_name ?? '',
    type: part.activity_type,
    sport_type: part.activity_type,
    distance: (part.distance_km ?? 0) * 1000,
    moving_time: Math.round((part.duration_minutes ?? 0) * 60),
    elapsed_time: Math.round((part.duration_minutes ?? 0) * 60),
    start_date: part.created_at,
    start_date_local: activityDate + 'T00:00:00',
    athlete: { id: 0 },
  }

  const streakActive = await checkStreak(serviceClient, user.id)
  const points = calculatePoints(session, fakeActivity, streakActive)

  // Mark session complete
  await serviceClient
    .from('sessions')
    .update({
      completed: true,
      completed_at: fakeActivity.start_date_local,
      strava_activity_id: part.strava_activity_id,
      points_awarded: points.total,
    })
    .eq('id', session.id)

  // Award points to group member
  const { data: member } = await serviceClient
    .from('group_members')
    .select('points')
    .eq('group_id', part.group_id)
    .eq('user_id', user.id)
    .single()

  if (member) {
    await serviceClient
      .from('group_members')
      .update({ points: member.points + points.total })
      .eq('group_id', part.group_id)
      .eq('user_id', user.id)
  }

  // Fetch group name for the notification
  const { data: group } = await serviceClient
    .from('groups')
    .select('name')
    .eq('id', part.group_id)
    .single()

  await serviceClient.from('notifications').insert({
    user_id: user.id,
    type: 'activity_matched',
    group_id: part.group_id,
    data: {
      activity_name: part.activity_name ?? 'Activity',
      session_description: session.target_description,
      points_awarded: points.total,
      group_name: group?.name ?? '',
    },
  })

  // Delete the brick part — it's been resolved
  await serviceClient.from('brick_activity_parts').delete().eq('id', part.id)

  return NextResponse.json({ ok: true })
}

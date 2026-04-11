import { findPendingBrickSession, matchActivity } from './activity-matcher'
import { calculatePoints } from '@/lib/points/calculator'
import { ensureFreshToken, getStravaActivity } from './oauth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, StravaActivity, StravaWebhookPayload } from '@/types'

// Raw Strava types that constitute real legs of a brick workout.
// Workout and Transition types (multisport transition segments) are intentionally excluded
// so they never trigger or falsely complete a brick session.
const REAL_RIDE_TYPES = new Set(['Ride', 'VirtualRide'])
const REAL_RUN_TYPES = new Set(['Run', 'VirtualRun'])

export function isRealRide(activity: StravaActivity): boolean {
  return REAL_RIDE_TYPES.has(activity.type ?? activity.sport_type)
}

export function isRealRun(activity: StravaActivity): boolean {
  return REAL_RUN_TYPES.has(activity.type ?? activity.sport_type)
}

/**
 * Processes a batch of webhook events that share the same owner_id and event_time.
 *
 * A batch containing at least one real ride + one real run is a brick workout —
 * Strava splits the Garmin multisport file into separate activities. These are
 * matched to the user's pending brick session using the combined elapsed time.
 * Workout/Transition activities (the in-between segment Strava sometimes creates)
 * are ignored during classification.
 *
 * All other batches process each activity individually against pending sessions.
 */
export async function processBatch(
  serviceClient: SupabaseClient,
  events: Array<{ id: string; payload: StravaWebhookPayload }>
): Promise<void> {
  const activityEvents = events.filter(
    (e) => e.payload.object_type === 'activity' && e.payload.aspect_type === 'create'
  )
  if (activityEvents.length === 0) return

  const ownerId = activityEvents[0].payload.owner_id

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('strava_athlete_id', ownerId)
    .single()

  if (!profile) return

  const accessToken = await ensureFreshToken(serviceClient, profile)

  // Fetch full activity details for every event in this batch
  const activities: StravaActivity[] = []
  for (const event of activityEvents) {
    try {
      const activity = await getStravaActivity(event.payload.object_id, accessToken)
      activities.push(activity)
    } catch (e) {
      console.error(`Failed to fetch Strava activity ${event.payload.object_id}:`, e)
    }
  }
  if (activities.length === 0) return

  const rides = activities.filter(isRealRide)
  const runs = activities.filter(isRealRun)
  const isBrickBatch = rides.length >= 1 && runs.length >= 1

  if (isBrickBatch) {
    await processBrickBatch(serviceClient, profile, rides, runs)
  } else {
    const { data: pendingSessions } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('completed', false)

    if (!pendingSessions || pendingSessions.length === 0) return

    const streakActive = await checkStreak(serviceClient, profile.id)

    for (const activity of activities) {
      await processSingleActivity(
        serviceClient,
        profile,
        activity,
        pendingSessions as Session[],
        streakActive
      )
    }
  }
}

async function processBrickBatch(
  serviceClient: SupabaseClient,
  profile: { id: string },
  rides: StravaActivity[],
  runs: StravaActivity[]
): Promise<void> {
  const { data: pendingSessions } = await serviceClient
    .from('sessions')
    .select('*')
    .eq('user_id', profile.id)
    .eq('completed', false)

  if (!pendingSessions || pendingSessions.length === 0) return

  const activityDate = rides[0].start_date_local.split('T')[0]

  // Combined elapsed time of both legs (excluding any transition segments)
  const totalElapsedMinutes = [...rides, ...runs].reduce(
    (sum, a) => sum + a.elapsed_time / 60,
    0
  )

  const sessionsByGroup = new Map<string, Session[]>()
  for (const session of pendingSessions as Session[]) {
    const bucket = sessionsByGroup.get(session.group_id) ?? []
    bucket.push(session)
    sessionsByGroup.set(session.group_id, bucket)
  }

  const matchedSessions: Session[] = []
  for (const [, groupSessions] of sessionsByGroup) {
    const brickSession = findPendingBrickSession(groupSessions, activityDate)
    if (!brickSession) continue

    // Check duration threshold against combined ride + run elapsed time
    if (
      brickSession.target_duration_minutes !== null &&
      totalElapsedMinutes < brickSession.target_duration_minutes * 0.85
    ) {
      continue
    }

    matchedSessions.push(brickSession)
  }

  if (matchedSessions.length === 0) return

  const streakActive = await checkStreak(serviceClient, profile.id)

  const { data: groupsData } = await serviceClient
    .from('groups')
    .select('id, name')
    .in('id', matchedSessions.map((s) => s.group_id))
  const groupNameById = new Map(groupsData?.map((g) => [g.id, g.name]) ?? [])

  // Use the ride as the representative activity for points calculation
  const primaryActivity = rides[0]

  for (const session of matchedSessions) {
    const points = calculatePoints(session, primaryActivity, streakActive)

    await serviceClient
      .from('sessions')
      .update({
        completed: true,
        completed_at: primaryActivity.start_date_local,
        strava_activity_id: primaryActivity.id,
        points_awarded: points.total,
      })
      .eq('id', session.id)

    const { data: currentMember } = await serviceClient
      .from('group_members')
      .select('points')
      .eq('group_id', session.group_id)
      .eq('user_id', profile.id)
      .single()

    if (currentMember) {
      await serviceClient
        .from('group_members')
        .update({ points: currentMember.points + points.total })
        .eq('group_id', session.group_id)
        .eq('user_id', profile.id)
    }

    await serviceClient.from('notifications').insert({
      user_id: profile.id,
      type: 'activity_matched',
      group_id: session.group_id,
      data: {
        activity_name: primaryActivity.name,
        session_description: session.target_description,
        points_awarded: points.total,
        group_name: groupNameById.get(session.group_id) ?? '',
      },
    })
  }
}

async function processSingleActivity(
  serviceClient: SupabaseClient,
  profile: { id: string },
  activity: StravaActivity,
  pendingSessions: Session[],
  streakActive: boolean
): Promise<void> {
  const sessionsByGroup = new Map<string, Session[]>()
  for (const session of pendingSessions) {
    const bucket = sessionsByGroup.get(session.group_id) ?? []
    bucket.push(session)
    sessionsByGroup.set(session.group_id, bucket)
  }

  const matchedSessions: Session[] = []
  for (const [, groupSessions] of sessionsByGroup) {
    const match = matchActivity(activity, groupSessions)
    if (match) matchedSessions.push(match)
  }

  if (matchedSessions.length === 0) return

  const { data: groupsData } = await serviceClient
    .from('groups')
    .select('id, name')
    .in('id', matchedSessions.map((s) => s.group_id))
  const groupNameById = new Map(groupsData?.map((g) => [g.id, g.name]) ?? [])

  for (const matchedSession of matchedSessions) {
    const points = calculatePoints(matchedSession, activity, streakActive)

    await serviceClient
      .from('sessions')
      .update({
        completed: true,
        completed_at: activity.start_date_local,
        strava_activity_id: activity.id,
        points_awarded: points.total,
      })
      .eq('id', matchedSession.id)

    const { data: currentMember } = await serviceClient
      .from('group_members')
      .select('points')
      .eq('group_id', matchedSession.group_id)
      .eq('user_id', profile.id)
      .single()

    if (currentMember) {
      await serviceClient
        .from('group_members')
        .update({ points: currentMember.points + points.total })
        .eq('group_id', matchedSession.group_id)
        .eq('user_id', profile.id)
    }

    await serviceClient.from('notifications').insert({
      user_id: profile.id,
      type: 'activity_matched',
      group_id: matchedSession.group_id,
      data: {
        activity_name: activity.name,
        session_description: matchedSession.target_description,
        points_awarded: points.total,
        group_name: groupNameById.get(matchedSession.group_id) ?? '',
      },
    })
  }
}

async function checkStreak(serviceClient: SupabaseClient, userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentSessions } = await serviceClient
    .from('sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', sevenDaysAgo.toISOString())

  if (!recentSessions || recentSessions.length === 0) return false

  const completedDays = new Set(
    recentSessions.map((s: { completed_at: string }) => s.completed_at.split('T')[0])
  )

  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (!completedDays.has(dateStr)) return false
  }

  return true
}

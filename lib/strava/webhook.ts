import { createServiceClient } from '@/lib/supabase/server'
import { findPendingBrickSession, matchActivity } from './activity-matcher'
import { calculatePoints, mapStravaType } from '@/lib/points/calculator'
import { ensureFreshToken, getStravaActivity } from './oauth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, StravaActivity, StravaWebhookPayload } from '@/types'

export async function processWebhookEvent(payload: StravaWebhookPayload) {
  const serviceClient = createServiceClient()

  // Only handle new activity creation
  if (payload.object_type !== 'activity' || payload.aspect_type !== 'create') {
    return
  }

  const stravaAthleteId = payload.owner_id
  const stravaActivityId = payload.object_id

  // Find user by Strava athlete ID
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('strava_athlete_id', stravaAthleteId)
    .single()

  if (!profile) return

  // Get fresh token and fetch activity details
  const accessToken = await ensureFreshToken(serviceClient, profile)
  let activity: StravaActivity
  try {
    activity = await getStravaActivity(stravaActivityId, accessToken)
  } catch (e) {
    console.error('Failed to fetch Strava activity:', e)
    return
  }

  // Find all pending sessions for this user across active groups
  const { data: pendingSessions } = await serviceClient
    .from('sessions')
    .select('*')
    .eq('user_id', profile.id)
    .eq('completed', false)

  if (!pendingSessions || pendingSessions.length === 0) return

  // Match one session per group so the same activity credits all relevant groups
  const sessionsByGroup = new Map<string, Session[]>()
  for (const session of pendingSessions as Session[]) {
    const bucket = sessionsByGroup.get(session.group_id) ?? []
    bucket.push(session)
    sessionsByGroup.set(session.group_id, bucket)
  }

  const activityType = mapStravaType(activity.type ?? activity.sport_type)
  const activityDate = activity.start_date_local.split('T')[0]
  const isBrickLeg = (activityType === 'run' || activityType === 'ride') && !!activity.external_id

  // If this is a potential brick leg, fetch ALL stored complementary legs for this
  // user + external_id (one per group). The partner check runs before regular matching
  // so a brick's run leg can't be consumed by a scheduled standalone run session.
  let brickPartners: Array<{ id: string; group_id: string; distance_km: number | null; duration_minutes: number | null }> = []
  if (isBrickLeg) {
    const complementaryType = activityType === 'run' ? 'ride' : 'run'
    const { data: partners } = await serviceClient
      .from('brick_activity_parts')
      .select('id, group_id, distance_km, duration_minutes')
      .eq('user_id', profile.id)
      .eq('external_id', activity.external_id)
      .eq('activity_type', complementaryType)
    brickPartners = partners ?? []
  }

  const matchedSessions: Session[] = []

  for (const [groupId, groupSessions] of sessionsByGroup) {
    const brickPartner = brickPartners.find((p) => p.group_id === groupId) ?? null

    if (brickPartner) {
      // Second leg confirmed — combine both legs' stats and validate against brick target
      const combinedDistanceKm = (brickPartner.distance_km ?? 0) + activity.distance / 1000
      const combinedDurationMin = (brickPartner.duration_minutes ?? 0) + activity.elapsed_time / 60
      const brickSession = findPendingBrickSession(groupSessions, activityDate, combinedDistanceKm, combinedDurationMin)
      if (brickSession) {
        matchedSessions.push(brickSession)
        await serviceClient.from('brick_activity_parts').delete().eq('id', brickPartner.id)
      }
      continue
    }

    // Check for a pending brick session in this group for this week
    const brickSession = isBrickLeg ? findPendingBrickSession(groupSessions, activityDate) : null

    if (brickSession) {
      // First leg of a brick — park it so the user can see it in the UI.
      // Do NOT complete any regular session: the user will either wait for the
      // second leg (auto-completes the brick) or manually assign this leg to a
      // standalone session via the progress bar UI.
      await serviceClient.from('brick_activity_parts').insert({
        user_id: profile.id,
        group_id: groupId,
        external_id: activity.external_id!,
        activity_type: activityType,
        strava_activity_id: stravaActivityId,
        activity_name: activity.name,
        activity_date: activityDate,
        distance_km: activity.distance / 1000,
        duration_minutes: activity.elapsed_time / 60,
      })
      continue
    }

    // No brick involvement — match against regular sessions
    const match = matchActivity(activity, groupSessions)
    if (match) {
      matchedSessions.push(match)
    }
  }

  if (matchedSessions.length === 0) return

  // Check if user has a streak (7 consecutive days with completed sessions)
  const streakActive = await checkStreak(serviceClient, profile.id)

  // Pre-fetch group names for activity notifications
  const { data: groupsData } = await serviceClient
    .from('groups')
    .select('id, name')
    .in('id', matchedSessions.map((s) => s.group_id))
  const groupNameById = new Map(groupsData?.map((g) => [g.id, g.name]) ?? [])

  for (const matchedSession of matchedSessions) {
    const points = calculatePoints(matchedSession, activity, streakActive)

    // Mark session complete, using the activity's local timestamp so the displayed
    // date matches the user's local date rather than the server's UTC date
    await serviceClient
      .from('sessions')
      .update({
        completed: true,
        completed_at: activity.start_date_local,
        strava_activity_id: stravaActivityId,
        points_awarded: points.total,
      })
      .eq('id', matchedSession.id)

    // Award points to group member
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

    // Always notify the user their activity was received and matched
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

export async function checkStreak(serviceClient: SupabaseClient, userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentSessions } = await serviceClient
    .from('sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', sevenDaysAgo.toISOString())

  if (!recentSessions || recentSessions.length === 0) return false

  // Check there's a completion for each of the last 7 days
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

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

  const matchedSessions: Session[] = []
  for (const [, groupSessions] of sessionsByGroup) {
    const match = matchActivity(activity, groupSessions)
    if (match) {
      matchedSessions.push(match)
      continue
    }

    // No direct match — check if this run/ride is one leg of a split Garmin brick.
    // Strava splits multisport activities but preserves the same external_id across all parts.
    if ((activityType === 'run' || activityType === 'ride') && activity.external_id) {
      const brickSession = findPendingBrickSession(groupSessions, activityDate)
      if (brickSession) {
        const complementaryType = activityType === 'run' ? 'ride' : 'run'
        const { data: partner } = await serviceClient
          .from('brick_activity_parts')
          .select('id')
          .eq('user_id', profile.id)
          .eq('external_id', activity.external_id)
          .eq('activity_type', complementaryType)
          .maybeSingle()

        if (partner) {
          // Both legs are in — complete the brick and clean up the stored part
          matchedSessions.push(brickSession)
          await serviceClient.from('brick_activity_parts').delete().eq('id', partner.id)
        } else {
          // First leg — store it and wait for the other to arrive
          await serviceClient.from('brick_activity_parts').insert({
            user_id: profile.id,
            external_id: activity.external_id,
            activity_type: activityType,
          })
        }
      }
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

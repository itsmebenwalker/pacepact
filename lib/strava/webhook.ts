import { createServiceClient } from '@/lib/supabase/server'
import { findPendingBrickSession, getWeekBounds, matchActivity } from './activity-matcher'
import { calculatePoints, mapStravaType } from '@/lib/points/calculator'
import { ensureFreshToken, getStravaActivity } from './oauth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, StravaActivity, StravaWebhookPayload } from '@/types'

function brickPartToActivity(orphan: {
  strava_activity_id: number | null
  activity_name: string | null
  activity_type: string
  distance_km: number | null
  duration_minutes: number | null
  created_at: string
  activity_date: string | null
}, fallbackDate: string): StravaActivity {
  return {
    id: orphan.strava_activity_id ?? 0,
    name: orphan.activity_name ?? '',
    type: orphan.activity_type,
    sport_type: orphan.activity_type,
    distance: (orphan.distance_km ?? 0) * 1000,
    moving_time: Math.round((orphan.duration_minutes ?? 0) * 60),
    elapsed_time: Math.round((orphan.duration_minutes ?? 0) * 60),
    start_date: orphan.created_at,
    start_date_local: (orphan.activity_date ?? fallbackDate) + 'T00:00:00',
    athlete: { id: 0 },
  }
}

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
  const isRunOrRide = activityType === 'run' || activityType === 'ride'

  // Look for a stored complementary leg on the same day to confirm the second leg
  // of a brick has arrived (e.g. a morning ride followed by an evening run).
  let brickPartners: Array<{ id: string; group_id: string; distance_km: number | null; duration_minutes: number | null }> = []
  if (isRunOrRide) {
    const complementaryType = activityType === 'run' ? 'ride' : 'run'
    const { data: sameDayPartners } = await serviceClient
      .from('brick_activity_parts')
      .select('id, group_id, distance_km, duration_minutes')
      .eq('user_id', profile.id)
      .eq('activity_type', complementaryType)
      .eq('activity_date', activityDate)
    brickPartners = sameDayPartners ?? []
  }

  // Each entry pairs a session with the activity whose stats should drive points.
  // Orphan releases use stored stats rather than the current arriving activity.
  const matchedSessions: Array<{ session: Session; activity: StravaActivity }> = []

  for (const [groupId, groupSessions] of sessionsByGroup) {
    const brickPartner = brickPartners.find((p) => p.group_id === groupId) ?? null

    if (brickPartner) {
      // Second leg confirmed — combine both legs' stats and validate against brick target
      const combinedDistanceKm = (brickPartner.distance_km ?? 0) + activity.distance / 1000
      const combinedDurationMin = (brickPartner.duration_minutes ?? 0) + activity.elapsed_time / 60
      const brickSession = findPendingBrickSession(groupSessions, activityDate, combinedDistanceKm, combinedDurationMin)
      if (brickSession) {
        matchedSessions.push({ session: brickSession, activity })
        await serviceClient.from('brick_activity_parts').delete().eq('id', brickPartner.id)

        // Brick completed — release any orphaned parts that were parked for this
        // group during the same week and try to match them to regular sessions.
        // This handles the case where a standalone activity (e.g. a Monday run)
        // was parked because a brick was pending, and is now free to be credited.
        const { start: weekStart, end: weekEnd } = getWeekBounds(activityDate)
        const { data: orphans } = await serviceClient
          .from('brick_activity_parts')
          .select('*')
          .eq('user_id', profile.id)
          .eq('group_id', groupId)
          .gte('activity_date', weekStart)
          .lte('activity_date', weekEnd)

        const alreadyMatchedIds = new Set(matchedSessions.map((m) => m.session.id))

        for (const orphan of orphans ?? []) {
          const orphanActivity = brickPartToActivity(orphan, activityDate)

          const remainingSessions = groupSessions.filter((s) => !alreadyMatchedIds.has(s.id))
          const orphanMatch = matchActivity(orphanActivity, remainingSessions)
          if (orphanMatch) {
            matchedSessions.push({ session: orphanMatch, activity: orphanActivity })
            alreadyMatchedIds.add(orphanMatch.id)
            await serviceClient.from('brick_activity_parts').delete().eq('id', orphan.id)
          }
        }
      }
      continue
    }

    // No brick partner yet. If this is a run or ride and a brick session is
    // pending this week, park it as the first leg. Any run/ride in a brick week
    // is a potential leg — the user can manually assign it to a standalone
    // session, or orphan release will credit it automatically when the brick
    // eventually completes.
    if (isRunOrRide) {
      const pendingBrick = findPendingBrickSession(groupSessions, activityDate)
      if (pendingBrick) {
        await serviceClient.from('brick_activity_parts').insert({
          user_id: profile.id,
          group_id: groupId,
          activity_type: activityType,
          strava_activity_id: stravaActivityId,
          activity_name: activity.name,
          activity_date: activityDate,
          distance_km: activity.distance / 1000,
          duration_minutes: activity.elapsed_time / 60,
        })
        continue
      }
    }

    // No brick pending — try regular session matching
    const match = matchActivity(activity, groupSessions)
    if (match) {
      matchedSessions.push({ session: match, activity })
    }
  }

  if (matchedSessions.length === 0) return

  // Check if user has a streak (7 consecutive days with completed sessions)
  const streakActive = await checkStreak(serviceClient, profile.id)

  // Pre-fetch group names for activity notifications
  const { data: groupsData } = await serviceClient
    .from('groups')
    .select('id, name')
    .in('id', matchedSessions.map(({ session }) => session.group_id))
  const groupNameById = new Map(groupsData?.map((g) => [g.id, g.name]) ?? [])

  for (const { session: matchedSession, activity: matchedActivity } of matchedSessions) {
    const points = calculatePoints(matchedSession, matchedActivity, streakActive)

    // Mark session complete, using the activity's local timestamp so the displayed
    // date matches the user's local date rather than the server's UTC date
    await serviceClient
      .from('sessions')
      .update({
        completed: true,
        completed_at: matchedActivity.start_date_local,
        strava_activity_id: matchedActivity.id,
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
        activity_name: matchedActivity.name,
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

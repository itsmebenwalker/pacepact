import { addDays, startOfWeek, format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Group, TrainingSession } from '@/types'

export async function fanOutSessionsForUser(
  serviceClient: SupabaseClient,
  group: Group,
  userId: string
) {
  const sessions: TrainingSession[] = group.training_plan
  const planStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const rows = sessions.map((s) => {
    const weekOffset = (s.week_number - 1) * 7
    const dayOffset = s.day_of_week - 1
    const scheduledDate = format(addDays(addDays(planStart, weekOffset), dayOffset), 'yyyy-MM-dd')

    return {
      group_id: group.id,
      user_id: userId,
      week_number: s.week_number,
      session_type: s.session_type,
      target_distance_km: s.target_distance_km,
      target_duration_minutes: s.target_duration_minutes,
      target_description: s.target_description,
      scheduled_date: scheduledDate,
      tip: s.tip ?? null,
      completed: false,
    }
  })

  await serviceClient.from('sessions').insert(rows)
}

import { createServiceClient } from '@/lib/supabase/server'
import { tryRunPlanGeneration } from '@/lib/groups/plan-generation'
import { after } from 'next/server'
import { nanoid } from 'nanoid'
import type { EventType, Ambition, OtherSport } from '@/types'

export interface CreateGroupParams {
  name: string
  event_name: string
  event_type: EventType
  event_date: string
  ambition: Ambition
  other_sport?: OtherSport
  other_distance_km?: string
  members_cap?: number
  user_id: string
  stripe_session_id?: string
}

export async function createGroup(params: CreateGroupParams): Promise<{ groupId: string }> {
  const serviceClient = createServiceClient()
  const distanceKm = params.other_distance_km ? parseFloat(params.other_distance_km) : null

  const { data: group, error: groupError } = await serviceClient
    .from('groups')
    .insert({
      name: params.name,
      event_name: params.event_name,
      event_type: params.event_type,
      event_date: params.event_date,
      ambition: params.ambition,
      other_sport: params.other_sport ?? null,
      other_distance_km: distanceKm,
      members_cap: params.members_cap ?? null,
      training_plan: [],
      plan_status: 'generating',
      invite_code: nanoid(8),
      created_by: params.user_id,
      stripe_session_id: params.stripe_session_id ?? null,
    })
    .select()
    .single()

  if (groupError || !group) {
    throw new Error(groupError?.message ?? 'Failed to create group')
  }

  await serviceClient.from('group_members').insert({
    group_id: group.id,
    user_id: params.user_id,
    points: 0,
  })

  after(() => tryRunPlanGeneration(group.id))

  return { groupId: group.id }
}

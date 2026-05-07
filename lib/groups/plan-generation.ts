import { createServiceClient } from '@/lib/supabase/server'
import { generateTrainingPlan } from '@/lib/claude/generate-plan'
import { fanOutSessionsForUser } from '@/lib/groups/fan-out'
import { buildPlanGenerationFailedEmail } from '@/lib/resend/plan-generation-failed-email'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Group } from '@/types'

export const MAX_PLAN_GENERATION_ATTEMPTS = 3

// Stuck threshold: how long an in-flight attempt can run before we consider
// it dead and let another caller retry. The Anthropic stream itself takes
// 1–3 min for typical plans, so 10 min gives plenty of headroom.
export const STUCK_THRESHOLD_MS = 10 * 60 * 1000

/**
 * Atomically claims the next attempt for a group. Returns the group row if this
 * caller won the race (and should run generation), or null if another caller
 * already owns the in-flight attempt or the group is no longer eligible.
 *
 * Eligibility:
 *   - plan_status is 'generating'
 *   - attempts so far < MAX_PLAN_GENERATION_ATTEMPTS
 *   - last_attempt_at is null OR older than STUCK_THRESHOLD_MS
 *
 * The CAS is a single UPDATE … RETURNING so concurrent renders cannot kick off
 * two simultaneous generations.
 */
export async function claimGenerationAttempt(
  serviceClient: SupabaseClient,
  groupId: string
): Promise<Group | null> {
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString()

  // Fetch the current row first to read attempts (Supabase JS doesn't support
  // attempts = attempts + 1 directly, so we increment in JS and write back).
  const { data: current } = await serviceClient
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (!current) return null
  if (current.plan_status !== 'generating') return null
  if ((current.plan_generation_attempts ?? 0) >= MAX_PLAN_GENERATION_ATTEMPTS) return null

  // Build the CAS predicate. We require last_attempt_at to be either null or
  // older than the stuck cutoff, AND we match on the prior attempt count to
  // catch races (two callers both seeing attempts=1 and both wanting to start
  // attempt 2 — only one wins).
  const priorAttempts = current.plan_generation_attempts ?? 0
  const baseUpdate = serviceClient
    .from('groups')
    .update({
      plan_generation_attempts: priorAttempts + 1,
      plan_generation_last_attempt_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .eq('plan_status', 'generating')
    .eq('plan_generation_attempts', priorAttempts)

  // Match either "never attempted" or "stuck for too long". Filters (is/lt)
  // must come before .select().single() in the supabase-js chain.
  const filtered = current.plan_generation_last_attempt_at == null
    ? baseUpdate.is('plan_generation_last_attempt_at', null)
    : baseUpdate.lt('plan_generation_last_attempt_at', stuckCutoff)

  const { data: claimed } = await filtered.select().single()

  return (claimed as Group | null) ?? null
}

/**
 * Runs plan generation for a group that the caller has already claimed via
 * claimGenerationAttempt(). On success, marks the group ready, fans out
 * sessions to the creator, and inserts a plan_ready notification.
 *
 * On failure, logs the error and — if this was the last allowed attempt —
 * marks the group failed and emails the creator. Otherwise, leaves the row
 * with the bumped attempt count; the next stuck-detection pass will retry.
 */
export async function runPlanGeneration(
  serviceClient: SupabaseClient,
  group: Group
): Promise<void> {
  try {
    const { sessions, raw } = await generateTrainingPlan(
      group.event_type,
      group.event_date,
      group.ambition,
      group.other_sport ?? undefined,
      group.other_distance_km ?? undefined
    )

    await serviceClient
      .from('groups')
      .update({ training_plan: sessions, training_plan_raw: raw, plan_status: 'ready' })
      .eq('id', group.id)

    await fanOutSessionsForUser(serviceClient, { ...group, training_plan: sessions }, group.created_by)

    await serviceClient.from('notifications').insert({
      user_id: group.created_by,
      type: 'plan_ready',
      group_id: group.id,
      data: { group_name: group.name },
    })
  } catch (e) {
    console.error('Plan generation attempt failed:', { groupId: group.id, attempt: group.plan_generation_attempts, error: e })

    const isFinalAttempt = (group.plan_generation_attempts ?? 0) >= MAX_PLAN_GENERATION_ATTEMPTS
    if (isFinalAttempt) {
      await markGenerationFailedAndNotify(serviceClient, group)
    }
    // Otherwise: leave the row alone. attempts is already incremented;
    // last_attempt_at will tick past the stuck threshold and the next page
    // render of this group will pick it up.
  }
}

async function markGenerationFailedAndNotify(
  serviceClient: SupabaseClient,
  group: Group
): Promise<void> {
  await serviceClient
    .from('groups')
    .update({ plan_status: 'failed' })
    .eq('id', group.id)

  // Look up the creator's email (profiles doesn't store it; auth.users does).
  const { data: userData, error: userErr } = await serviceClient.auth.admin.getUserById(group.created_by)
  if (userErr || !userData?.user?.email) {
    console.error('Failed to look up creator email for plan-failed notification:', { groupId: group.id, error: userErr })
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping plan-failed email')
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { subject, html } = buildPlanGenerationFailedEmail({ groupName: group.name })

  try {
    await resend.emails.send({
      from: `PacePact <noreply@${process.env.RESEND_FROM_DOMAIN ?? 'pacepact.com.au'}>`,
      to: userData.user.email,
      subject,
      html,
    })
  } catch (e) {
    console.error('Failed to send plan-failed email:', { groupId: group.id, error: e })
  }
}

/**
 * Tries to claim the next attempt and run it. Safe to call from anywhere —
 * if another caller is already running an attempt, this is a no-op. Used by:
 *   - createGroup() to kick off attempt 1 right after insert
 *   - the group page render to revive a stuck attempt
 */
export async function tryRunPlanGeneration(groupId: string): Promise<void> {
  const serviceClient = createServiceClient()
  const claimed = await claimGenerationAttempt(serviceClient, groupId)
  if (!claimed) return
  await runPlanGeneration(serviceClient, claimed)
}

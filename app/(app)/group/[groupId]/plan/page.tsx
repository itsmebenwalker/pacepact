export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import WeekView from '@/components/training/WeekView'
import Link from 'next/link'
import { sortWeeks } from '@/lib/utils/week-status'
import { getLocalToday } from '@/lib/utils/local-date'
import type { BrickActivityPart, Session } from '@/types'

export default async function PlanPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from('groups').select('id, name, event_name, event_date, allow_manual_complete').eq('id', groupId).single(),
    supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ])

  if (!group || !membership) notFound()

  const [{ data: sessions }, { data: brickPartsRaw }] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('brick_activity_parts')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id),
  ])

  const brickParts = (brickPartsRaw ?? []) as BrickActivityPart[]

  const sessionsByWeek = new Map<number, Session[]>()
  for (const session of sessions ?? []) {
    const week = session.week_number
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, [])
    sessionsByWeek.get(week)!.push(session as Session)
  }

  const today = await getLocalToday()
  const weeks = sortWeeks(Array.from(sessionsByWeek.entries()), today)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Full training plan</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-sm">{group.event_name}</p>
        </div>
        <Link
          href={`/group/${groupId}`}
          className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
        >
          Back
        </Link>
      </div>

      <div className="space-y-4">
        {weeks.map(([weekNum, weekSessions]) => (
          <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} today={today} brickParts={brickParts} allowManualComplete={group.allow_manual_complete ?? true} />
        ))}
      </div>
    </div>
  )
}

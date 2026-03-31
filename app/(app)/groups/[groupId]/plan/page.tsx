import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WeekView from '@/components/training/WeekView'
import Link from 'next/link'
import type { Session } from '@/types'

export default async function PlanPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from('groups').select('id, name, event_name, event_date').eq('id', groupId).single(),
    supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user!.id).maybeSingle(),
  ])

  if (!group || !membership) notFound()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user!.id)
    .order('scheduled_date', { ascending: true })

  const sessionsByWeek = new Map<number, Session[]>()
  for (const session of sessions ?? []) {
    const week = session.week_number
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, [])
    sessionsByWeek.get(week)!.push(session as Session)
  }

  const weeks = Array.from(sessionsByWeek.entries()).sort(([a], [b]) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/groups/${groupId}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Full training plan</h1>
          <p className="text-gray-500 text-sm">{group.event_name}</p>
        </div>
      </div>

      <div className="space-y-4">
        {weeks.map(([weekNum, weekSessions]) => (
          <WeekView key={weekNum} weekNumber={weekNum} sessions={weekSessions} />
        ))}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import GroupCard from '@/components/groups/GroupCard'
import type { Group, EventType, Ambition } from '@/types'

interface GroupWithPoints extends Group {
  my_points: number
}

interface GroupRow {
  id: string
  name: string
  event_name: string
  event_type: EventType
  event_date: string
  ambition: Ambition
  invite_code: string
  invite_locked: boolean
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      points,
      joined_at,
      groups (
        id, name, event_name, event_type, event_date, ambition, invite_code, invite_locked
      )
    `)
    .eq('user_id', user!.id)
    .order('joined_at', { ascending: false })

  const groups: GroupWithPoints[] = memberships
    ?.filter((m) => m.groups != null)
    .map((m) => ({
      ...(m.groups as unknown as GroupRow),
      training_plan: [],
      training_plan_raw: undefined,
      created_by: '',
      created_at: '',
      my_points: m.points,
    })) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Groups</h1>
        <Link
          href="/groups/new"
          className="bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium px-4 py-2 rounded-md text-sm transition-colors"
        >
          New group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-900 dark:text-zinc-50 font-medium mb-2">No groups yet</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6">
            Create one for your next race, or ask a friend for their invite link.
          </p>
          <Link
            href="/groups/new"
            className="bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium px-5 py-2.5 rounded-md text-sm transition-colors"
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} myPoints={group.my_points} />
          ))}
        </div>
      )}
    </div>
  )
}

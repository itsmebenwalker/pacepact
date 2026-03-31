import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import GroupCard from '@/components/groups/GroupCard'
import type { Group, EventType, Ambition } from '@/types'

interface GroupWithPoints extends Group {
  my_points: number
}

// Shape of the joined group columns we select — using the exact union types
// so the spread satisfies GroupWithPoints without further casting.
interface GroupRow {
  id: string
  name: string
  event_name: string
  event_type: EventType
  event_date: string
  ambition: Ambition
  invite_code: string
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      points,
      joined_at,
      groups (
        id, name, event_name, event_type, event_date, ambition, invite_code
      )
    `)
    .eq('user_id', user!.id)
    .order('joined_at', { ascending: false })

  // Supabase infers joined relations as arrays without generated DB types,
  // so we go through `unknown` before asserting the actual row shape.
  const groups: GroupWithPoints[] = memberships?.map((m) => ({
    ...(m.groups as unknown as GroupRow),
    training_plan: [],
    training_plan_raw: undefined,
    created_by: '',
    created_at: '',
    my_points: m.points,
  })) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your groups</h1>
        <Link
          href="/groups/new"
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + New group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg mb-4">No groups yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Create one for your next race, or ask a friend for their invite link.
          </p>
          <Link
            href="/groups/new"
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} myPoints={group.my_points} />
          ))}
        </div>
      )}
    </div>
  )
}

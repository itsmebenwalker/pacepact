export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import IncreaseMembersCapForm from '@/components/groups/IncreaseMembersCapForm'

export default async function IncreaseCapPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, created_by, members_cap, event_date')
    .eq('id', groupId)
    .single()

  if (!group || group.created_by !== user.id || group.members_cap == null) notFound()

  const serviceClient = createServiceClient()
  const { count: memberCount } = await serviceClient
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Member limit</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-sm">{group.name}</p>
      </div>

      <IncreaseMembersCapForm
        groupId={groupId}
        currentCap={group.members_cap}
        memberCount={memberCount ?? 0}
        eventDate={group.event_date}
      />
    </div>
  )
}

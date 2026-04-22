import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const { data: group } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.created_by === user.id) {
    return NextResponse.json(
      { error: 'Group admins cannot leave — transfer admin rights to another member first' },
      { status: 403 }
    )
  }

  const serviceClient = createServiceClient()

  const { data: member } = await serviceClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'You are not a member of this group' }, { status: 404 })
  }

  const { error } = await serviceClient
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 })
  }

  // Clean up all group-scoped data for the departing user
  await Promise.all([
    serviceClient.from('sessions').delete().eq('group_id', groupId).eq('user_id', user.id),
    serviceClient.from('brick_activity_parts').delete().eq('group_id', groupId).eq('user_id', user.id),
  ])

  return NextResponse.json({ ok: true })
}

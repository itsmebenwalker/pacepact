import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ groupId: string; userId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { groupId, userId } = await params
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

  if (group.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group creator can remove members' }, { status: 403 })
  }

  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself from the group' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Verify the target is actually a member
  const { data: member } = await serviceClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Remove from the group
  const { error: deleteError } = await serviceClient
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  // Clean up all group-scoped data for the removed user, and ban in parallel
  await Promise.all([
    serviceClient.from('sessions').delete().eq('group_id', groupId).eq('user_id', userId),
    serviceClient.from('brick_activity_parts').delete().eq('group_id', groupId).eq('user_id', userId),
    serviceClient.from('group_member_bans').insert({ group_id: groupId, user_id: userId, banned_by: user.id }),
  ])

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: Params) {
  const { groupId, userId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const { action } = await request.json() as { action: string }

  if (action !== 'make_creator') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: group } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group creator can transfer ownership' }, { status: 403 })
  }

  if (userId === user.id) {
    return NextResponse.json({ error: 'You are already the group creator' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Verify target is a member
  const { data: member } = await serviceClient
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Target user is not a member of this group' }, { status: 404 })
  }

  const { error } = await serviceClient
    .from('groups')
    .update({ created_by: userId })
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: 'Failed to transfer group ownership' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  const { data: group } = await supabase
    .from('groups')
    .select('created_by, invite_locked, allow_manual_complete, members_cap')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group creator can edit this group' }, { status: 403 })
  }

  const body = await request.json() as Record<string, unknown>
  const serviceClient = createServiceClient()

  if (body.action === 'rotate_invite') {
    const newCode = nanoid(8)
    const { error } = await serviceClient
      .from('groups')
      .update({ invite_code: newCode })
      .eq('id', groupId)

    if (error) {
      return NextResponse.json({ error: 'Failed to rotate invite code' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, invite_code: newCode })
  }

  if (body.action === 'toggle_invite_lock') {
    const { error } = await serviceClient
      .from('groups')
      .update({ invite_locked: !group.invite_locked })
      .eq('id', groupId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update invite lock' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, invite_locked: !group.invite_locked })
  }

  if (body.action === 'toggle_manual_complete') {
    const next = !group.allow_manual_complete
    const { error } = await serviceClient
      .from('groups')
      .update({ allow_manual_complete: next })
      .eq('id', groupId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update manual complete setting' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, allow_manual_complete: next })
  }

  if (body.action === 'update_members_cap') {
    const newCap = body.members_cap as number

    if (typeof newCap !== 'number' || !Number.isInteger(newCap) || newCap < 1) {
      return NextResponse.json({ error: 'Invalid members cap' }, { status: 400 })
    }

    if (group.members_cap !== null && newCap <= group.members_cap) {
      return NextResponse.json({ error: 'Members cap can only be increased' }, { status: 400 })
    }

    const { error } = await serviceClient
      .from('groups')
      .update({ members_cap: newCap })
      .eq('id', groupId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update members cap' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, members_cap: newCap })
  }

  // Default action: edit group name + event name
  const { name, event_name } = body as { name: string; event_name: string }

  if (!name?.trim() || !event_name?.trim()) {
    return NextResponse.json({ error: 'Name and event name are required' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('groups')
    .update({ name: name.trim(), event_name: event_name.trim() })
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  // Verify the current user is the group creator
  const { data: group } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group creator can delete this group' }, { status: 403 })
  }

  // Delete via service client — cascades to group_members, sessions, messages
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

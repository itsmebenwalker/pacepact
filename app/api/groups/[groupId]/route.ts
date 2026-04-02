import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
